import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isTaskUrgent(task: { priority: string; dueDate?: string | null; due_date?: string | null; status?: string }): boolean {
  if (!task.due_date || task.status === 'completed') {
    return false;
  }
  
  const dueDate = parseISO(task.due_date);
  const today = new Date();
  const daysUntilDue = differenceInDays(dueDate, today);
  
  // Return true if due date is tomorrow or today (0-1 days)
  return daysUntilDue <= 1 && daysUntilDue >= 0;
}
