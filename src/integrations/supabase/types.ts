export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          module: string
          record_id: string | null
          record_type: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          module: string
          record_id?: string | null
          record_type?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          module?: string
          record_id?: string | null
          record_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          author_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          announcement_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          announcement_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          reaction: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          id: string
          pinned: boolean | null
          priority: string | null
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          pinned?: boolean | null
          priority?: string | null
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          pinned?: boolean | null
          priority?: string | null
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          is_late: boolean | null
          notes: string | null
          overtime_hours: number | null
          user_id: string
          work_hours: number | null
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          is_late?: boolean | null
          notes?: string | null
          overtime_hours?: number | null
          user_id: string
          work_hours?: number | null
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          is_late?: boolean | null
          notes?: string | null
          overtime_hours?: number | null
          user_id?: string
          work_hours?: number | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_urls: string[] | null
          content: string | null
          created_at: string
          edited: boolean | null
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_urls?: string[] | null
          content?: string | null
          created_at?: string
          edited?: boolean | null
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_urls?: string[] | null
          content?: string | null
          created_at?: string
          edited?: boolean | null
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dm_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_audit_log: {
        Row: {
          change_type: string
          changed_by: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          table_name: string
          user_id: string
        }
        Insert: {
          change_type: string
          changed_by: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          table_name: string
          user_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_url: string
          id: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          uploaded_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_profiles: {
        Row: {
          bank_account: string | null
          created_at: string
          department: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          hiring_certificates: string[] | null
          hiring_cv_url: string | null
          hiring_date: string | null
          hiring_position: string | null
          id: string
          national_id: string | null
          notes: string | null
          previous_experience: string | null
          resignation_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account?: string | null
          created_at?: string
          department?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hiring_certificates?: string[] | null
          hiring_cv_url?: string | null
          hiring_date?: string | null
          hiring_position?: string | null
          id?: string
          national_id?: string | null
          notes?: string | null
          previous_experience?: string | null
          resignation_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account?: string | null
          created_at?: string
          department?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hiring_certificates?: string[] | null
          hiring_cv_url?: string | null
          hiring_date?: string | null
          hiring_position?: string | null
          id?: string
          national_id?: string | null
          notes?: string | null
          previous_experience?: string | null
          resignation_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_qualifications: {
        Row: {
          created_at: string
          date_obtained: string | null
          document_url: string | null
          field_of_study: string | null
          id: string
          institution: string | null
          qualification_type: string
          title: string
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          date_obtained?: string | null
          document_url?: string | null
          field_of_study?: string | null
          id?: string
          institution?: string | null
          qualification_type: string
          title: string
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          date_obtained?: string | null
          document_url?: string | null
          field_of_study?: string | null
          id?: string
          institution?: string | null
          qualification_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      experience_letters: {
        Row: {
          ceo_approved: boolean | null
          ceo_approved_at: string | null
          ceo_approved_by: string | null
          content: string | null
          created_at: string
          final_document_url: string | null
          generated_data: Json | null
          hr_approved: boolean | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          id: string
          letter_type: string
          period_end: string | null
          period_start: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ceo_approved?: boolean | null
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          content?: string | null
          created_at?: string
          final_document_url?: string | null
          generated_data?: Json | null
          hr_approved?: boolean | null
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          id?: string
          letter_type?: string
          period_end?: string | null
          period_start?: string | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ceo_approved?: boolean | null
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          content?: string | null
          created_at?: string
          final_document_url?: string | null
          generated_data?: Json | null
          hr_approved?: boolean | null
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          id?: string
          letter_type?: string
          period_end?: string | null
          period_start?: string | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hr_warnings: {
        Row: {
          absence_count: number | null
          acknowledged: boolean | null
          acknowledged_at: string | null
          action_taken: string | null
          created_at: string
          description: string | null
          id: string
          issued_by: string | null
          late_count: number | null
          month: string
          staff_id: string
          warning_level: number
          warning_type: string
        }
        Insert: {
          absence_count?: number | null
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          action_taken?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issued_by?: string | null
          late_count?: number | null
          month: string
          staff_id: string
          warning_level?: number
          warning_type: string
        }
        Update: {
          absence_count?: number | null
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          action_taken?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issued_by?: string | null
          late_count?: number | null
          month?: string
          staff_id?: string
          warning_level?: number
          warning_type?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_email: string
          applicant_name: string
          cover_message: string | null
          created_at: string
          cv_url: string | null
          id: string
          position: string | null
          status: string
          updated_at: string
          user_id: string | null
          vacancy_id: string | null
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          cover_message?: string | null
          created_at?: string
          cv_url?: string | null
          id?: string
          position?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vacancy_id?: string | null
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          cover_message?: string | null
          created_at?: string
          cv_url?: string | null
          id?: string
          position?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vacancy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "job_vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_vacancies: {
        Row: {
          benefits: string | null
          certifications: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          department: string | null
          description: string | null
          education: string | null
          employment_type: string
          experience: string | null
          id: string
          location: string | null
          openings: number
          qualifications: string | null
          reporting_manager: string | null
          responsibilities: string | null
          salary_range: string | null
          skills: string | null
          status: string
          title: string
          updated_at: string
          vacancy_type: string
          working_hours: string | null
        }
        Insert: {
          benefits?: string | null
          certifications?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          education?: string | null
          employment_type?: string
          experience?: string | null
          id?: string
          location?: string | null
          openings?: number
          qualifications?: string | null
          reporting_manager?: string | null
          responsibilities?: string | null
          salary_range?: string | null
          skills?: string | null
          status?: string
          title: string
          updated_at?: string
          vacancy_type?: string
          working_hours?: string | null
        }
        Update: {
          benefits?: string | null
          certifications?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          education?: string | null
          employment_type?: string
          experience?: string | null
          id?: string
          location?: string | null
          openings?: number
          qualifications?: string | null
          reporting_manager?: string | null
          responsibilities?: string | null
          salary_range?: string | null
          skills?: string | null
          status?: string
          title?: string
          updated_at?: string
          vacancy_type?: string
          working_hours?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          reaction: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          reaction?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          reaction?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          created_at: string
          edited: boolean | null
          id: string
          is_voice: boolean | null
          read: boolean | null
          receiver_id: string
          sender_id: string
          updated_at: string
          voice_duration: number | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          edited?: boolean | null
          id?: string
          is_voice?: boolean | null
          read?: boolean | null
          receiver_id: string
          sender_id: string
          updated_at?: string
          voice_duration?: number | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          edited?: boolean | null
          id?: string
          is_voice?: boolean | null
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
          updated_at?: string
          voice_duration?: number | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string
          group_id: string
          id: string
          notes: string | null
          status: string
          target_date: string | null
          title: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          notes?: string | null
          status?: string
          target_date?: string | null
          title: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          notes?: string | null
          status?: string
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "project_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_records: {
        Row: {
          actual_value: number
          approved: boolean | null
          approved_by: string | null
          created_at: string
          flagged: boolean | null
          grade: number
          id: string
          period_key: string
          plan_id: string | null
          plan_type: string
          planned_value: number
          staff_id: string
        }
        Insert: {
          actual_value?: number
          approved?: boolean | null
          approved_by?: string | null
          created_at?: string
          flagged?: boolean | null
          grade?: number
          id?: string
          period_key: string
          plan_id?: string | null
          plan_type: string
          planned_value?: number
          staff_id: string
        }
        Update: {
          actual_value?: number
          approved?: boolean | null
          approved_by?: string | null
          created_at?: string
          flagged?: boolean | null
          grade?: number
          id?: string
          period_key?: string
          plan_id?: string | null
          plan_type?: string
          planned_value?: number
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_records_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_scores: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          notes: string | null
          points: number
          quarter: string
          staff_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          points?: number
          quarter: string
          staff_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          points?: number
          quarter?: string
          staff_id?: string
        }
        Relationships: []
      }
      performance_summaries: {
        Row: {
          average_grade: number | null
          created_at: string
          flagged_count: number | null
          id: string
          period_key: string
          period_type: string
          record_count: number | null
          staff_id: string
          status: string | null
          total_actual: number | null
          total_planned: number | null
          total_plans: number | null
          updated_at: string
        }
        Insert: {
          average_grade?: number | null
          created_at?: string
          flagged_count?: number | null
          id?: string
          period_key: string
          period_type: string
          record_count?: number | null
          staff_id: string
          status?: string | null
          total_actual?: number | null
          total_planned?: number | null
          total_plans?: number | null
          updated_at?: string
        }
        Update: {
          average_grade?: number | null
          created_at?: string
          flagged_count?: number | null
          id?: string
          period_key?: string
          period_type?: string
          record_count?: number | null
          staff_id?: string
          status?: string | null
          total_actual?: number | null
          total_planned?: number | null
          total_plans?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      plan_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          plan_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          plan_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_comments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_performance_records: {
        Row: {
          achievement_pct: number | null
          actual_value: number
          approved_at: string | null
          approved_by: string | null
          ceo_adjusted_grade: number | null
          ceo_notes: string | null
          created_at: string
          flagged: boolean | null
          grade: number
          id: string
          period_key: string
          plan_id: string | null
          plan_type: string
          planned_value: number
          staff_id: string
          status: string
        }
        Insert: {
          achievement_pct?: number | null
          actual_value?: number
          approved_at?: string | null
          approved_by?: string | null
          ceo_adjusted_grade?: number | null
          ceo_notes?: string | null
          created_at?: string
          flagged?: boolean | null
          grade?: number
          id?: string
          period_key: string
          plan_id?: string | null
          plan_type: string
          planned_value?: number
          staff_id: string
          status?: string
        }
        Update: {
          achievement_pct?: number | null
          actual_value?: number
          approved_at?: string | null
          approved_by?: string | null
          ceo_adjusted_grade?: number | null
          ceo_notes?: string | null
          created_at?: string
          flagged?: boolean | null
          grade?: number
          id?: string
          period_key?: string
          plan_id?: string | null
          plan_type?: string
          planned_value?: number
          staff_id?: string
          status?: string
        }
        Relationships: []
      }
      plan_reactions: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_reactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          actual_value: number | null
          attachment_urls: string[] | null
          author_id: string
          content: string | null
          created_at: string
          grade: number | null
          id: string
          mentioned_user_ids: string[] | null
          plan_type: string
          planned_value: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          attachment_urls?: string[] | null
          author_id: string
          content?: string | null
          created_at?: string
          grade?: number | null
          id?: string
          mentioned_user_ids?: string[] | null
          plan_type?: string
          planned_value?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          attachment_urls?: string[] | null
          author_id?: string
          content?: string | null
          created_at?: string
          grade?: number | null
          id?: string
          mentioned_user_ids?: string[] | null
          plan_type?: string
          planned_value?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: []
      }
      project_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          member_ids: string[] | null
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          member_ids?: string[] | null
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          member_ids?: string[] | null
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          action_items: string | null
          actual_date: string | null
          created_at: string
          group_id: string
          id: string
          notes: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          target_date: string | null
          target_percentage: number
          title: string
        }
        Insert: {
          action_items?: string | null
          actual_date?: string | null
          created_at?: string
          group_id: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          target_date?: string | null
          target_percentage?: number
          title: string
        }
        Update: {
          action_items?: string | null
          actual_date?: string | null
          created_at?: string
          group_id?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          target_date?: string | null
          target_percentage?: number
          title?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          group_id: string
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          group_id: string
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          group_id?: string
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "project_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string
          content: string
          created_at: string
          group_id: string
          id: string
          update_type: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          group_id: string
          id?: string
          update_type?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "project_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      quarter_winners: {
        Row: {
          announced_by: string | null
          average_grade: number | null
          created_at: string
          id: string
          message: string | null
          posted_by: string | null
          quarter: string
          winner_id: string
        }
        Insert: {
          announced_by?: string | null
          average_grade?: number | null
          created_at?: string
          id?: string
          message?: string | null
          posted_by?: string | null
          quarter: string
          winner_id: string
        }
        Update: {
          announced_by?: string | null
          average_grade?: number | null
          created_at?: string
          id?: string
          message?: string | null
          posted_by?: string | null
          quarter?: string
          winner_id?: string
        }
        Relationships: []
      }
      recycle_bin: {
        Row: {
          created_at: string
          deleted_by: string
          id: string
          record_data: Json
          record_id: string
          table_name: string
        }
        Insert: {
          created_at?: string
          deleted_by: string
          id?: string
          record_data: Json
          record_id: string
          table_name: string
        }
        Update: {
          created_at?: string
          deleted_by?: string
          id?: string
          record_data?: Json
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      salary_configs: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          payment_type: string
          staff_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          currency?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          payment_type?: string
          staff_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          payment_type?: string
          staff_id?: string
        }
        Relationships: []
      }
      salary_payments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_amount: number | null
          created_at: string
          created_by: string
          deductions: number | null
          gross_salary: number | null
          id: string
          net_salary: number | null
          notes: string | null
          paid_at: string | null
          payment_type: string
          period_end: string
          period_start: string
          staff_id: string
          status: string
          units: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number | null
          created_at?: string
          created_by: string
          deductions?: number | null
          gross_salary?: number | null
          id?: string
          net_salary?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_type: string
          period_end: string
          period_start: string
          staff_id: string
          status?: string
          units?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number | null
          created_at?: string
          created_by?: string
          deductions?: number | null
          gross_salary?: number | null
          id?: string
          net_salary?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_type?: string
          period_end?: string
          period_start?: string
          staff_id?: string
          status?: string
          units?: number | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          audience: string
          author_id: string | null
          content: string | null
          content_type: string
          created_at: string
          featured_image: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          author_id?: string | null
          content?: string | null
          content_type?: string
          created_at?: string
          featured_image?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          author_id?: string | null
          content?: string | null
          content_type?: string
          created_at?: string
          featured_image?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          can_create_staff: boolean | null
          can_edit_profiles: boolean | null
          can_manage_attendance: boolean | null
          can_manage_projects: boolean | null
          can_manage_salary: boolean | null
          can_pause_users: boolean | null
          can_post_announcements: boolean | null
          can_reset_passwords: boolean | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create_staff?: boolean | null
          can_edit_profiles?: boolean | null
          can_manage_attendance?: boolean | null
          can_manage_projects?: boolean | null
          can_manage_salary?: boolean | null
          can_pause_users?: boolean | null
          can_post_announcements?: boolean | null
          can_reset_passwords?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create_staff?: boolean | null
          can_edit_profiles?: boolean | null
          can_manage_attendance?: boolean | null
          can_manage_projects?: boolean | null
          can_manage_salary?: boolean | null
          can_pause_users?: boolean | null
          can_post_announcements?: boolean | null
          can_reset_passwords?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_sub_departments: {
        Row: {
          created_at: string
          id: string
          sub_department_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sub_department_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sub_department_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_sub_departments_sub_department_id_fkey"
            columns: ["sub_department_id"]
            isOneToOne: false
            referencedRelation: "sub_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_departments: {
        Row: {
          created_at: string
          department_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          subscribed: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          subscribed?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          subscribed?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          assigned_to_ids: string[] | null
          attachment_urls: string[] | null
          category: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_ids?: string[] | null
          attachment_urls?: string[] | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_ids?: string[] | null
          attachment_urls?: string[] | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          attachment_urls: string[] | null
          content: string | null
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment_urls?: string[] | null
          content?: string | null
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment_urls?: string[] | null
          content?: string | null
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "ceo"
        | "cto"
        | "coo"
        | "cio"
        | "hr"
        | "sysadmin"
        | "staff"
        | "finance_manager"
        | "bd_head"
        | "network_engineer"
        | "support_tech"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "ceo",
        "cto",
        "coo",
        "cio",
        "hr",
        "sysadmin",
        "staff",
        "finance_manager",
        "bd_head",
        "network_engineer",
        "support_tech",
      ],
    },
  },
} as const
