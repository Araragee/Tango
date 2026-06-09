export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          household_id: string
          created_by: string
          title: string
          amount: number
          type: 'expense' | 'income'
          category: string
          icon: string
          date: string
          note: string | null
          receipt_url: string | null
          paid_by: string | null
          version: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          created_by?: string | null
          title: string
          amount: number
          type: 'expense' | 'income'
          category?: string
          icon?: string
          date: string
          note?: string | null
          receipt_url?: string | null
          paid_by?: string | null
          version?: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          created_by?: string | null
          title?: string
          amount?: number
          type?: 'expense' | 'income'
          category?: string
          icon?: string
          date?: string
          note?: string | null
          receipt_url?: string | null
          paid_by?: string | null
          version?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          id: string
          household_id: string
          created_by: string
          title: string
          description: string | null
          saved: number
          target: number
          icon: string
          deadline: string | null
          status: string
          progress: number
          completed_at: string | null
          category: string | null
          priority: 'Low' | 'Normal' | 'High' | null
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          created_by?: string | null
          title: string
          description?: string | null
          saved?: number
          target: number
          icon?: string
          deadline?: string | null
          status?: string
          progress?: number
          completed_at?: string | null
          category?: string | null
          priority?: 'Low' | 'Normal' | 'High' | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          created_by?: string | null
          title?: string
          description?: string | null
          saved?: number
          target?: number
          icon?: string
          deadline?: string | null
          status?: string
          progress?: number
          completed_at?: string | null
          category?: string | null
          priority?: 'Low' | 'Normal' | 'High' | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      todos: {
        Row: {
          id: string
          household_id: string
          owner_id: string
          text: string
          completed: boolean
          shared: boolean
          category: string
          assigned: string | null
          assignee_id: string | null
          priority: 'Chill' | 'Normal' | 'ASAP' | null
          subtext: string | null
          due_date: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
          recurrence: string | null
          recurrence_next_at: string | null
          checklist: any[] | null
          updated_by: string | null
          version: number
        }
        Insert: {
          id?: string
          household_id: string
          owner_id?: string | null
          text: string
          completed?: boolean
          shared?: boolean
          category?: string
          assigned?: string | null
          assignee_id?: string | null
          priority?: 'Chill' | 'Normal' | 'ASAP' | null
          subtext?: string | null
          due_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          recurrence?: string | null
          recurrence_next_at?: string | null
          checklist?: any[] | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          id?: string
          household_id?: string
          owner_id?: string | null
          text?: string
          completed?: boolean
          shared?: boolean
          category?: string
          assigned?: string | null
          assignee_id?: string | null
          priority?: 'Chill' | 'Normal' | 'ASAP' | null
          subtext?: string | null
          due_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          recurrence?: string | null
          recurrence_next_at?: string | null
          checklist?: any[] | null
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "todos_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      calendar_events: {
        Row: {
          id: string
          household_id: string
          created_by: string
          title: string
          date: string
          time: string
          category: string
          icon: string
          partners: string[]
          mood: number | null
          review_note: string | null
          notes: string | null
          created_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          id?: string
          household_id: string
          created_by?: string | null
          title: string
          date: string
          time: string
          category?: string
          icon?: string
          partners?: string[]
          mood?: number | null
          review_note?: string | null
          notes?: string | null
          created_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          id?: string
          household_id?: string
          created_by?: string | null
          title?: string
          date?: string
          time?: string
          category?: string
          icon?: string
          partners?: string[]
          mood?: number | null
          review_note?: string | null
          notes?: string | null
          created_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      goal_contributions: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          amount: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          user_id?: string | null
          amount: number
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          user_id?: string | null
          amount?: number
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_transactions: {
        Row: {
          id: string
          household_id: string
          created_by: string
          title: string
          amount: number
          type: 'expense' | 'income'
          category: string
          icon: string
          cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
          start_date: string
          end_date: string | null
          next_run_at: string
          last_run_at: string | null
          active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          created_by?: string | null
          title: string
          amount: number
          type: 'expense' | 'income'
          category?: string
          icon?: string
          cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
          start_date: string
          end_date?: string | null
          next_run_at: string
          last_run_at?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          created_by?: string | null
          title?: string
          amount?: number
          type?: 'expense' | 'income'
          category?: string
          icon?: string
          cadence?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
          start_date?: string
          end_date?: string | null
          next_run_at?: string
          last_run_at?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: 'creator' | 'partner'
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role: 'creator' | 'partner'
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          role?: 'creator' | 'partner'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      household_invites: {
        Row: {
          id: string
          household_id: string
          code: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          code: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          code?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          household_id: string
          user_id: string | null
          table_name: string
          row_id: string
          action: string
          before: Json | null
          after: Json | null
          summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id?: string | null
          table_name: string
          row_id: string
          action: string
          before?: Json | null
          after?: Json | null
          summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string | null
          table_name?: string
          row_id?: string
          action?: string
          before?: Json | null
          after?: Json | null
          summary?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          type: string
          title: string
          body: string | null
          payload: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          type: string
          title: string
          body?: string | null
          payload?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          type?: string
          title?: string
          body?: string | null
          payload?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          invite_code: string
          created_at?: string
        }
        Update: {
          id?: string
          invite_code?: string
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          user_agent: string | null
          created_at: string
          last_used_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          user_agent?: string | null
          created_at?: string
          last_used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth_key?: string
          user_agent?: string | null
          created_at?: string
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          code: string
          unlocked_at: string
          payload: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          code: string
          unlocked_at?: string
          payload?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          code?: string
          unlocked_at?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household: {
        Args: { invite_code: string }
        Returns: string
      }
      join_household: {
        Args: { invite_code: string }
        Returns: string
      }
      is_household_member: {
        Args: { hid: string }
        Returns: boolean
      }
      advance_recurring_next: {
        Args: { r_id: string }
        Returns: string
      }
      create_invite: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      revoke_invites: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      redeem_invite: {
        Args: { invite_code: string }
        Returns: string
      }
      remove_member: {
        Args: { target_user_id: string }
        Returns: unknown
      }
      rename_household: {
        Args: { new_name: string }
        Returns: unknown
      }
      leave_household: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      transfer_creator: {
        Args: { new_creator: string }
        Returns: unknown
      }
      delete_my_data: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      mark_notifications_read: {
        Args: { ids: string[] | null }
        Returns: number
      }
      nudge_partner_todo: {
        Args: { todo_id: string }
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
