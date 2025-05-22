"use client"
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calculator,
    IndianRupee,
    Percent,
    Calendar,
    Plus,
    Trash2,
    Edit,
    Save,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

// Helper function to calculate EMI based on principal, rate, and total tenure
const calculateEMI = (principal: number, rate: number, time: number): number => {
    if (time <= 0) return 0; // Handle zero or negative tenure
    if (rate === 0) return principal / time;
    const r = rate / 12 / 100; // Monthly interest rate
    const n = time;             // Number of months
    const numerator = principal * r * Math.pow(1 + r, n);
    const denominator = Math.pow(1 + r, n) - 1;
    return numerator / denominator;
};

// Helper function to calculate remaining principal
// This formula assumes the original amortization schedule.
const calculateRemainingPrincipal = (
    originalPrincipal: number,
    annualRate: number,
    totalTenureMonths: number,
    paidMonths: number
): number => {
    if (paidMonths >= totalTenureMonths) return 0; // Loan fully paid
    if (annualRate === 0) {
        return originalPrincipal - (originalPrincipal / totalTenureMonths) * paidMonths;
    }

    const monthlyRate = annualRate / 12 / 100;
    // This formula calculates the remaining principal based on the original loan terms
    // and how many payments have been made according to the original schedule.
    const remainingPrincipal = originalPrincipal *
        (Math.pow(1 + monthlyRate, totalTenureMonths) - Math.pow(1 + monthlyRate, paidMonths)) /
        (Math.pow(1 + monthlyRate, totalTenureMonths) - 1);

    return remainingPrincipal > 0 ? remainingPrincipal : 0; // Ensure non-negative
};

// Helper function to get the number of months between two dates
const getMonthsBetweenDates = (startDateStr: string, endDateStr: string): number => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 0;
    }

    const diffYears = endDate.getFullYear() - startDate.getFullYear();
    const diffMonths = endDate.getMonth() - startDate.getMonth();
    return diffYears * 12 + diffMonths;
};

// Define the shape of a loan object
interface Loan {
    id: string;
    name: string;
    amount: number; // Original principal
    interestRate: number; // Annual interest rate
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    emiAmount: number; // User-entered EMI
    emiDueDate: number; // Day of the month (1-31)
    paidMonths: number; // How many months have been paid
    totalTenureMonths: number; // Calculated from startDate and endDate
    calculatedEmi: number; // EMI calculated by formula (for reference)
}

// Animation variants
const loanCardVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.2 } }
};

const LoanEMICalculatorApp = () => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newLoan, setNewLoan] = useState<Omit<Loan, 'id' | 'totalTenureMonths' | 'calculatedEmi' | 'paidMonths'>>({
        name: '',
        amount: 0,
        interestRate: 0,
        startDate: '',
        endDate: '',
        emiAmount: 0,
        emiDueDate: 1, // Default to 1st of the month
    });
    const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Function to display a temporary message
    const showMessage = useCallback((type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        const timer = setTimeout(() => {
            setMessage(null);
        }, 3000); // Message disappears after 3 seconds
        return () => clearTimeout(timer);
    }, []);

    // Function to add a new loan
    const addLoan = useCallback(() => {
        const totalTenureMonths = getMonthsBetweenDates(newLoan.startDate, newLoan.endDate);

        if (!newLoan.name.trim() || newLoan.amount <= 0 || newLoan.interestRate < 0 ||
            !newLoan.startDate || !newLoan.endDate || newLoan.emiAmount <= 0 ||
            newLoan.emiDueDate < 1 || newLoan.emiDueDate > 31 || totalTenureMonths <= 0) {
            showMessage('error', 'Please fill in all fields with valid values (dates must be valid and end date after start date).');
            return;
        }

        const calculatedEmi = calculateEMI(newLoan.amount, newLoan.interestRate, totalTenureMonths);
        const newLoanWithId: Loan = {
            id: crypto.randomUUID(),
            ...newLoan,
            totalTenureMonths,
            calculatedEmi,
            paidMonths: 0, // Initialize paid months to 0 for new loans
        };
        setLoans([...loans, newLoanWithId]);
        setNewLoan({ name: '', amount: 0, interestRate: 0, startDate: '', endDate: '', emiAmount: 0, emiDueDate: 1 }); // Reset form
        setIsAddingNew(false); // Hide the form
        showMessage('success', 'Loan added successfully!');
    }, [newLoan, loans, showMessage]);

    // Function to delete a loan
    const deleteLoan = useCallback((id: string) => {
        setLoans(loans.filter((loan) => loan.id !== id));
        showMessage('success', 'Loan deleted successfully!');
    }, [loans, showMessage]);

    // Function to start editing a loan
    const startEditingLoan = (id: string) => {
        setEditingLoanId(id);
        const loanToEdit = loans.find((loan) => loan.id === id);
        if (loanToEdit) {
            setNewLoan({
                name: loanToEdit.name,
                amount: loanToEdit.amount,
                interestRate: loanToEdit.interestRate,
                startDate: loanToEdit.startDate,
                endDate: loanToEdit.endDate,
                emiAmount: loanToEdit.emiAmount,
                emiDueDate: loanToEdit.emiDueDate,
            });
        }
    };

    // Function to save edited loan
    const saveEditedLoan = useCallback((id: string) => {
        const totalTenureMonths = getMonthsBetweenDates(newLoan.startDate, newLoan.endDate);

        if (!newLoan.name.trim() || newLoan.amount <= 0 || newLoan.interestRate < 0 ||
            !newLoan.startDate || !newLoan.endDate || newLoan.emiAmount <= 0 ||
            newLoan.emiDueDate < 1 || newLoan.emiDueDate > 31 || totalTenureMonths <= 0) {
            showMessage('error', 'Please fill in all fields with valid values (dates must be valid and end date after start date).');
            return;
        }
        const updatedLoans = loans.map((loan) => {
            if (loan.id === id) {
                const calculatedEmi = calculateEMI(newLoan.amount, newLoan.interestRate, totalTenureMonths);
                return {
                    ...loan,
                    ...newLoan, // Update all fields from newLoan
                    totalTenureMonths,
                    calculatedEmi,
                    // Preserve paidMonths when editing other details
                };
            }
            return loan;
        });
        setLoans(updatedLoans);
        setEditingLoanId(null);
        setNewLoan({ name: '', amount: 0, interestRate: 0, startDate: '', endDate: '', emiAmount: 0, emiDueDate: 1 });
        showMessage('success', 'Loan updated successfully!');
    }, [loans, newLoan, showMessage]);

    // Function to increment paid months for a loan
    const payMonth = useCallback((id: string) => {
        setLoans(prevLoans => prevLoans.map(loan => {
            if (loan.id === id) {
                const newPaidMonths = loan.paidMonths + 1;
                if (newPaidMonths > loan.totalTenureMonths) {
                    showMessage('error', 'All months already paid for this loan!');
                    return loan;
                }
                showMessage('success', `Paid month ${newPaidMonths} for ${loan.name}!`);
                return { ...loan, paidMonths: newPaidMonths };
            }
            return loan;
        }));
    }, [showMessage]);

    // Handle input change for new loan form and edit form
    const handleInputChange = (
        field: keyof typeof newLoan,
        value: string
    ) => {
        setNewLoan(prev => ({
            ...prev,
            [field]: field === 'name' || field === 'startDate' || field === 'endDate'
                ? value
                : Number(value),
        }));
    };

    return (
        <div className="min-h-screen  p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center flex items-center justify-center gap-2">
                    <Calculator className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                    Loan EMI Calculator
                </h1>

                {/* Message Display */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            className={cn(
                                "fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50",
                                message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                            )}
                        >
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            <span>{message.text}</span>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Add New Loan Button */}
                {!isAddingNew && (
                    <Button
                        onClick={() => setIsAddingNew(true)}
                        className="mb-6 bg-gradient-to-r from-green-500 to-blue-500
                                  hover:from-green-600 hover:to-blue-600 transition-colors duration-300
                                  shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Loan
                    </Button>
                )}

                {/* New Loan Form */}
                <AnimatePresence>
                    {isAddingNew && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.3 }}
                            className="mb-6"
                        >
                            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold">
                                        Add New Loan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="newLoanName"
                                            className=" block text-sm font-medium"
                                        >
                                            Loan Name
                                        </label>
                                        <Input
                                            id="newLoanName"
                                            value={newLoan.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                            placeholder="e.g., Home Loan, Car Loan"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="newLoanAmount"
                                            className=" block text-sm font-medium flex items-center gap-1"
                                        >
                                            <IndianRupee className="w-4 h-4" />
                                            Loan Amount (₹)
                                        </label>
                                        <Input
                                            id="newLoanAmount"
                                            type="number"
                                            value={newLoan.amount === 0 ? '' : newLoan.amount}
                                            onChange={(e) => handleInputChange('amount', e.target.value)}
                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                            placeholder="Enter loan amount"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="newInterestRate"
                                            className=" block text-sm font-medium flex items-center gap-1"
                                        >
                                            <Percent className="w-4 h-4" />
                                            Interest Rate (%)
                                        </label>
                                        <Input
                                            id="newInterestRate"
                                            type="number"
                                            value={newLoan.interestRate === 0 ? '' : newLoan.interestRate}
                                            onChange={(e) => handleInputChange('interestRate', e.target.value)}
                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                            placeholder="Enter annual interest rate"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="newStartDate"
                                            className=" block text-sm font-medium flex items-center gap-1"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            Start Date
                                        </label>
                                        <Input
                                            id="newStartDate"
                                            type="date"
                                            value={newLoan.startDate}
                                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="newEndDate"
                                            className=" block text-sm font-medium flex items-center gap-1"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            End Date
                                        </label>
                                        <Input
                                            id="newEndDate"
                                            type="date"
                                            value={newLoan.endDate}
                                            onChange={(e) => handleInputChange('endDate', e.target.value)}
                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="newEmiAmount"
                                            className=" block text-sm font-medium flex items-center gap-1"
                                        >
                                            <IndianRupee className="w-4 h-4" />
                                            EMI Amount (₹)
                                        </label>
                                        <Input
                                            id="newEmiAmount"
                                            type="number"
                                            value={newLoan.emiAmount === 0 ? '' : newLoan.emiAmount}
                                            onChange={(e) => handleInputChange('emiAmount', e.target.value)}
                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                            placeholder="Enter your monthly EMI"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="newEmiDueDate"
                                            className=" block text-sm font-medium flex items-center gap-1"
                                        >
                                            <Clock className="w-4 h-4" />
                                            EMI Due Date (Day of Month)
                                        </label>
                                        <Input
                                            id="newEmiDueDate"
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={newLoan.emiDueDate}
                                            onChange={(e) => handleInputChange('emiDueDate', e.target.value)}
                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                            placeholder="e.g., 1, 15, 30"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 mt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsAddingNew(false);
                                                setNewLoan({ name: '', amount: 0, interestRate: 0, startDate: '', endDate: '', emiAmount: 0, emiDueDate: 1 });
                                            }}
                                            className="text-gray-300 hover: hover:bg-gray-700/50 border-gray-700/50"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={addLoan}
                                            className="bg-gradient-to-r from-purple-500 to-blue-500
                                                      hover:from-purple-600 hover:to-blue-600 transition-colors duration-300
                                                      shadow-lg hover:shadow-purple-500/50"
                                        >
                                            Add Loan
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Display Existing Loans */}
                <AnimatePresence>
                    {loans.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-semibold mb-4">Your Loans</h2>
                            {loans.map((loan) => (
                                <motion.div
                                    key={loan.id}
                                    variants={loanCardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl rounded-2xl">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-lg font-medium">
                                                {editingLoanId === loan.id ? (
                                                    <Input
                                                        value={newLoan.name}
                                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                                        className="bg-black/20 border-purple-500/30 placeholder:text-gray-500 w-full"
                                                        placeholder="Loan Name"
                                                    />
                                                ) : (
                                                    loan.name
                                                )}
                                            </CardTitle>
                                            <div className="flex gap-2">
                                                {editingLoanId === loan.id ? (
                                                    <Button
                                                        size="icon"
                                                        onClick={() => saveEditedLoan(loan.id)}
                                                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="icon"
                                                        onClick={() => startEditingLoan(loan.id)}
                                                        className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                <Button
                                                    size="icon"
                                                    onClick={() => deleteLoan(loan.id)}
                                                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {editingLoanId === loan.id ? (
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className=" block text-sm font-medium">
                                                            Loan Amount (₹)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            value={newLoan.amount === 0 ? '' : newLoan.amount}
                                                            onChange={(e) => handleInputChange('amount', e.target.value)}
                                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className=" block text-sm font-medium">
                                                            Interest Rate (%)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            value={newLoan.interestRate === 0 ? '' : newLoan.interestRate}
                                                            onChange={(e) => handleInputChange('interestRate', e.target.value)}
                                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className=" block text-sm font-medium">
                                                            Start Date
                                                        </label>
                                                        <Input
                                                            type="date"
                                                            value={newLoan.startDate}
                                                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className=" block text-sm font-medium">
                                                            End Date
                                                        </label>
                                                        <Input
                                                            type="date"
                                                            value={newLoan.endDate}
                                                            onChange={(e) => handleInputChange('endDate', e.target.value)}
                                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className=" block text-sm font-medium">
                                                            EMI Amount (₹)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            value={newLoan.emiAmount === 0 ? '' : newLoan.emiAmount}
                                                            onChange={(e) => handleInputChange('emiAmount', e.target.value)}
                                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className=" block text-sm font-medium">
                                                            EMI Due Date (Day of Month)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="31"
                                                            value={newLoan.emiDueDate}
                                                            onChange={(e) => handleInputChange('emiDueDate', e.target.value)}
                                                            className="bg-black/20 border-purple-500/30 placeholder:text-gray-500"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-gray-300 space-y-1">
                                                    <p>
                                                        <strong>Amount:</strong> ₹{loan.amount.toFixed(2)}
                                                    </p>
                                                    <p>
                                                        <strong>Interest Rate:</strong> {loan.interestRate}%
                                                    </p>
                                                    <p>
                                                        <strong>Start Date:</strong> {new Date(loan.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </p>
                                                    <p>
                                                        <strong>End Date:</strong> {new Date(loan.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </p>
                                                    <p>
                                                        <strong>EMI Due Date:</strong> {loan.emiDueDate}
                                                        {loan.emiDueDate === 1 ? 'st' : loan.emiDueDate === 2 ? 'nd' : loan.emiDueDate === 3 ? 'rd' : 'th'} of month
                                                    </p>
                                                    <p className="text-lg font-semibold text-green-400">
                                                        <strong>Your EMI:</strong> ₹{loan.emiAmount.toFixed(2)}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        (Calculated EMI: ₹{loan.calculatedEmi.toFixed(2)})
                                                    </p>
                                                    <div className="border-t border-white/10 pt-2 mt-2">
                                                        <p>
                                                            <strong>Total Tenure:</strong> {loan.totalTenureMonths} months
                                                        </p>
                                                        <p>
                                                            <strong>Months Paid:</strong> {loan.paidMonths}
                                                            <Button
                                                                size="sm"
                                                                onClick={() => payMonth(loan.id)}
                                                                className="ml-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300"
                                                                disabled={loan.paidMonths >= loan.totalTenureMonths}
                                                            >
                                                                Pay Month
                                                            </Button>
                                                        </p>
                                                        <p>
                                                            <strong>Total Paid:</strong> ₹{(loan.emiAmount * loan.paidMonths).toFixed(2)}
                                                        </p>
                                                        <p>
                                                            <strong>Remaining Principal:</strong> ₹{calculateRemainingPrincipal(loan.amount, loan.interestRate, loan.totalTenureMonths, loan.paidMonths).toFixed(2)}
                                                        </p>
                                                        <p>
                                                            <strong>Remaining Months:</strong> {loan.totalTenureMonths - loan.paidMonths}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default LoanEMICalculatorApp;