import { defineStore } from 'pinia';

export interface Transaction {
  id: number;
  title: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
  icon: string;
  category: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  saved: number;
  target: number;
  status: string;
  icon: string;
  progress: number;
  deadline?: string;
}

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  category: string;
  shared?: boolean;
  subtext?: string;
  assigned?: string;
  priority?: 'Chill' | 'Normal' | 'ASAP';
}

export interface CalendarEvent {
  id: number;
  title: string;
  time: string;
  date: string;
  category: string;
  partners: string[];
  icon: string;
}

export const useAppStore = defineStore('app', {
  state: () => {
    const savedState = localStorage.getItem('tango-state');
    if (savedState) {
      return JSON.parse(savedState);
    }
    return {
      budget: {
        balance: 8450,
        monthlySpending: [
          { id: 1, category: 'Housing', spent: 2000, limit: 2500, icon: 'home' },
          { id: 2, category: 'Groceries', spent: 450, limit: 600, icon: 'restaurant' },
        ],
        recentActivity: [
          { id: 1, title: 'Whole Foods Market', amount: -142.50, date: 'Today', type: 'expense', icon: 'shopping_cart', category: 'Groceries' },
          { id: 2, title: 'Salary Deposit', amount: 3200.00, date: 'Yesterday', type: 'income', icon: 'account_balance', category: 'Salary' },
          { id: 3, title: 'Electric Utility', amount: -85.00, date: 'Oct 24', type: 'expense', icon: 'bolt', category: 'Bills' },
        ] as Transaction[],
        savedThisMonth: 450
      },
      plans: {
        goals: [
          { id: 1, title: 'Japan Trip 2025', description: 'Autumn leaves and sushi.', saved: 4500, target: 8000, status: 'On Track', icon: 'flight_takeoff', progress: 56 },
          { id: 2, title: 'Down Payment', description: '', saved: 12000, target: 50000, status: '', icon: 'home', progress: 24 },
          { id: 3, title: 'Puppy Fund', description: '', saved: 800, target: 1500, status: '', icon: 'pets', progress: 53 },
        ] as Goal[]
      },
      todos: {
        items: [
          { id: 1, text: 'Oat milk (Barista blend)', completed: false, category: 'Grocery List', assigned: 'Both' },
          { id: 2, text: 'Fresh spinach', completed: true, category: 'Grocery List', assigned: 'Both' },
          { id: 3, text: 'Run the dishwasher', completed: false, category: 'House Chores', shared: true, assigned: 'Both' },
          { id: 4, text: 'Take out recycling', completed: false, category: 'House Chores', subtext: 'Tuesday morning', assigned: 'Both' },
          { id: 5, text: 'Review tax documents', completed: false, category: 'Work', assigned: 'Alex' },
        ] as Todo[]
      },
      calendar: {
        events: [
          { id: 1, title: 'Date Night', time: '7:00 PM - 10:00 PM', date: '2023-10-14', category: 'date', partners: ['P1', 'P2'], icon: 'restaurant' },
          { id: 2, title: 'Dentist Appt', time: '2:30 PM - 3:30 PM', date: '2023-10-16', category: 'errand', partners: ['P2'], icon: 'dentistry' },
        ] as CalendarEvent[],
        currentMonth: 'October 2023'
      },
      activeView: 'Landing'
    };
  },
  actions: {
    setActiveView(view: string) {
      this.activeView = view;
    },
    // Budget Actions
    addTransaction(transaction: Omit<Transaction, 'id'>) {
      const id = Math.max(0, ...this.budget.recentActivity.map(t => t.id)) + 1;
      this.budget.recentActivity.unshift({ ...transaction, id });
      this.budget.balance += transaction.amount;
    },
    deleteTransaction(id: number) {
      const index = this.budget.recentActivity.findIndex(t => t.id === id);
      if (index !== -1) {
        this.budget.balance -= this.budget.recentActivity[index].amount;
        this.budget.recentActivity.splice(index, 1);
      }
    },
    updateBalance(amount: number) {
      this.budget.balance = amount;
    },
    // Plans Actions
    addGoal(goal: Omit<Goal, 'id' | 'progress'>) {
      const id = Math.max(0, ...this.plans.goals.map(g => g.id)) + 1;
      const progress = Math.round((goal.saved / goal.target) * 100);
      this.plans.goals.push({ ...goal, id, progress });
    },
    editGoal(id: number, updates: Partial<Goal>) {
      const goal = this.plans.goals.find(g => g.id === id);
      if (goal) {
        Object.assign(goal, updates);
        goal.progress = Math.round((goal.saved / goal.target) * 100);
      }
    },
    updateGoalProgress(id: number, saved: number) {
      const goal = this.plans.goals.find(g => g.id === id);
      if (goal) {
        goal.saved = saved;
        goal.progress = Math.round((goal.saved / goal.target) * 100);
      }
    },
    // To-Do Actions
    addTask(task: Omit<Todo, 'id' | 'completed'>) {
      const id = Math.max(0, ...this.todos.items.map(t => t.id)) + 1;
      this.todos.items.push({ ...task, id, completed: false });
    },
    deleteTask(id: number) {
      this.todos.items = this.todos.items.filter(t => t.id !== id);
    },
    toggleTodo(id: number) {
      const todo = this.todos.items.find(item => item.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    },
    // Calendar Actions
    addEvent(event: Omit<CalendarEvent, 'id'>) {
      const id = Math.max(0, ...this.calendar.events.map(e => e.id)) + 1;
      this.calendar.events.push({ ...event, id });
    },
    editEvent(id: number, updates: Partial<CalendarEvent>) {
      const event = this.calendar.events.find(e => e.id === id);
      if (event) {
        Object.assign(event, updates);
      }
    },
    deleteEvent(id: number) {
      this.calendar.events = this.calendar.events.filter(e => e.id !== id);
    },
    syncWithPartner() {
      // Placeholder for future sync logic
      console.log('Syncing with partner...');
    }
  }
});

// Persistence
export function setupStorePersistence(store: ReturnType<typeof useAppStore>) {
  store.$subscribe((mutation, state) => {
    localStorage.setItem('tango-state', JSON.stringify(state));
  });
}
