import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    budget: {
      balance: 8450,
      monthlySpending: [
        { id: 1, category: 'Housing', spent: 2000, limit: 2500, icon: 'home' },
        { id: 2, category: 'Groceries', spent: 450, limit: 600, icon: 'restaurant' },
      ],
      recentActivity: [
        { id: 1, title: 'Whole Foods Market', amount: -142.50, date: 'Today', type: 'expense', icon: 'shopping_cart' },
        { id: 2, title: 'Salary Deposit', amount: 3200.00, date: 'Yesterday', type: 'income', icon: 'account_balance' },
        { id: 3, title: 'Electric Utility', amount: -85.00, date: 'Oct 24', type: 'expense', icon: 'bolt' },
      ],
      savedThisMonth: 450
    },
    plans: {
      goals: [
        { id: 1, title: 'Japan Trip 2025', description: 'Autumn leaves and sushi.', saved: 4500, target: 8000, status: 'On Track', icon: 'flight_takeoff', progress: 56 },
        { id: 2, title: 'Down Payment', description: '', saved: 12000, target: 50000, status: '', icon: 'home', progress: 24 },
        { id: 3, title: 'Puppy Fund', description: '', saved: 800, target: 1500, status: '', icon: 'pets', progress: 53 },
      ]
    },
    todos: {
      items: [
        { id: 1, text: 'Oat milk (Barista blend)', completed: false, category: 'Grocery List' },
        { id: 2, text: 'Fresh spinach', completed: true, category: 'Grocery List' },
        { id: 3, text: 'Run the dishwasher', completed: false, category: 'House Chores', shared: true },
        { id: 4, text: 'Take out recycling', completed: false, category: 'House Chores', subtext: 'Tuesday morning' },
        { id: 5, text: 'Review tax documents', completed: false, category: 'Work' },
      ]
    },
    calendar: {
      events: [
        { id: 1, title: 'Date Night', time: '7:00 PM - 10:00 PM', date: '2023-10-14', category: 'date', partners: ['P1', 'P2'], icon: 'restaurant' },
        { id: 2, title: 'Dentist Appt', time: '2:30 PM - 3:30 PM', date: '2023-10-16', category: 'errand', partners: ['P2'], icon: 'dentistry' },
      ],
      currentMonth: 'October 2023'
    },
    activeView: 'Landing'
  }),
  actions: {
    setActiveView(view: string) {
      this.activeView = view;
    },
    toggleTodo(id: number) {
      const todo = this.todos.items.find(item => item.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    }
  }
});
