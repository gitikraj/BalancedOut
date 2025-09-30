"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Authenticated } from "convex/react";

export default function FabNewExpense() {
  return (
    <Authenticated>
        <Link
        href="/expenses/new"
        aria-label="Add a new expense"
        className="
            fixed bottom-5 right-5 z-50
            flex items-center gap-2 px-4 py-3
            rounded-full bg-emerald-600 text-white
            shadow-lg hover:shadow-xl
            hover:bg-emerald-700 focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2
            transition
        "
        >
        <Plus className="h-5 w-5" />
        <span className="text-sm font-medium">New Expense</span>
        </Link>
    </Authenticated>
  );
}
