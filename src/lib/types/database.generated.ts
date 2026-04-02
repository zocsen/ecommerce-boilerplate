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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          used_count: number
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          code: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          code?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          line_total: number
          order_id: string
          product_id: string
          quantity: number
          title_snapshot: string
          unit_price_snapshot: number
          variant_id: string | null
          variant_snapshot: Json
          vat_rate: number
        }
        Insert: {
          id?: string
          line_total: number
          order_id: string
          product_id: string
          quantity: number
          title_snapshot: string
          unit_price_snapshot: number
          variant_id?: string | null
          variant_snapshot?: Json
          vat_rate?: number
        }
        Update: {
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          quantity?: number
          title_snapshot?: string
          unit_price_snapshot?: number
          variant_id?: string | null
          variant_snapshot?: Json
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          abandoned_cart_sent_at: string | null
          barion_payment_id: string | null
          barion_payment_request_id: string | null
          barion_status: string | null
          billing_address: Json
          cod_fee: number
          coupon_code: string | null
          created_at: string
          currency: string
          discount_total: number
          email: string
          id: string
          idempotency_key: string | null
          invoice_number: string | null
          invoice_provider: string | null
          invoice_url: string | null
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup_point_id: string | null
          pickup_point_label: string | null
          pickup_point_provider: string | null
          shipped_at: string | null
          shipping_address: Json
          shipping_fee: number
          shipping_method: string
          shipping_phone: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abandoned_cart_sent_at?: string | null
          barion_payment_id?: string | null
          barion_payment_request_id?: string | null
          barion_status?: string | null
          billing_address?: Json
          cod_fee?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_total?: number
          email: string
          id?: string
          idempotency_key?: string | null
          invoice_number?: string | null
          invoice_provider?: string | null
          invoice_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pickup_point_id?: string | null
          pickup_point_label?: string | null
          pickup_point_provider?: string | null
          shipped_at?: string | null
          shipping_address?: Json
          shipping_fee?: number
          shipping_method?: string
          shipping_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abandoned_cart_sent_at?: string | null
          barion_payment_id?: string | null
          barion_payment_request_id?: string | null
          barion_status?: string | null
          billing_address?: Json
          cod_fee?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_total?: number
          email?: string
          id?: string
          idempotency_key?: string | null
          invoice_number?: string | null
          invoice_provider?: string | null
          invoice_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pickup_point_id?: string | null
          pickup_point_label?: string | null
          pickup_point_provider?: string | null
          shipped_at?: string | null
          shipping_address?: Json
          shipping_fee?: number
          shipping_method?: string
          shipping_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          content_html: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content_html?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content_html?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          compare_at_price: number | null
          id: string
          price: number
          product_id: string
          recorded_at: string
          variant_id: string | null
        }
        Insert: {
          compare_at_price?: number | null
          id?: string
          price: number
          product_id: string
          recorded_at?: string
          variant_id?: string | null
        }
        Update: {
          compare_at_price?: number | null
          id?: string
          price?: number
          product_id?: string
          recorded_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_extras: {
        Row: {
          created_at: string
          extra_product_id: string
          extra_variant_id: string | null
          id: string
          is_default_checked: boolean
          label: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          extra_product_id: string
          extra_variant_id?: string | null
          id?: string
          is_default_checked?: boolean
          label: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          extra_product_id?: string
          extra_variant_id?: string | null
          id?: string
          is_default_checked?: boolean
          label?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_extras_extra_product_id_fkey"
            columns: ["extra_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_extras_extra_variant_id_fkey"
            columns: ["extra_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_extras_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          option1_name: string
          option1_value: string | null
          option2_name: string | null
          option2_value: string | null
          price_override: number | null
          product_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          option1_name?: string
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          price_override?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          option1_name?: string
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          price_override?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: string
          image_urls: string[]
          is_active: boolean
          main_image_url: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          vat_rate: number
          weight_grams: number | null
        }
        Insert: {
          base_price: number
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          is_active?: boolean
          main_image_url?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          vat_rate?: number
          weight_grams?: number | null
        }
        Update: {
          base_price?: number
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          is_active?: boolean
          main_image_url?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          vat_rate?: number
          weight_grams?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_billing_address: Json | null
          default_pickup_point: Json | null
          default_shipping_address: Json | null
          full_name: string | null
          id: string
          is_agency_owner: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          default_billing_address?: Json | null
          default_pickup_point?: Json | null
          default_shipping_address?: Json | null
          full_name?: string | null
          id: string
          is_agency_owner?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          default_billing_address?: Json | null
          default_pickup_point?: Json | null
          default_shipping_address?: Json | null
          full_name?: string | null
          id?: string
          is_agency_owner?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          body: string
          created_at: string
          id: string
          is_verified_purchase: boolean
          order_id: string | null
          product_id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          body: string
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          body?: string
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_pages: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_published: boolean
          page_key: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          page_key: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          page_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_plans: {
        Row: {
          base_annual_price: number
          base_monthly_price: number
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_annual_price?: number
          base_monthly_price?: number
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_annual_price?: number
          base_monthly_price?: number
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_subscriptions: {
        Row: {
          barion_funding_source: string | null
          barion_recurrence_token: string | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          custom_annual_price: number | null
          custom_monthly_price: number | null
          feature_overrides: Json
          grace_period_end: string | null
          id: string
          last_payment_id: string | null
          notes: string | null
          payment_method: string | null
          plan_id: string
          renewal_attempts: number
          shop_identifier: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          barion_funding_source?: string | null
          barion_recurrence_token?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          custom_annual_price?: number | null
          custom_monthly_price?: number | null
          feature_overrides?: Json
          grace_period_end?: string | null
          id?: string
          last_payment_id?: string | null
          notes?: string | null
          payment_method?: string | null
          plan_id: string
          renewal_attempts?: number
          shop_identifier: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          barion_funding_source?: string | null
          barion_recurrence_token?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          custom_annual_price?: number | null
          custom_monthly_price?: number | null
          feature_overrides?: Json
          grace_period_end?: string | null
          id?: string
          last_payment_id?: string | null
          notes?: string | null
          payment_method?: string | null
          plan_id?: string
          renewal_attempts?: number
          shop_identifier?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "shop_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          bounce_count: number
          click_count: number
          created_at: string
          email: string
          id: string
          last_clicked_at: string | null
          last_opened_at: string | null
          open_count: number
          source: string | null
          status: Database["public"]["Enums"]["subscriber_status"]
          tags: string[]
          unsubscribed_at: string | null
        }
        Insert: {
          bounce_count?: number
          click_count?: number
          created_at?: string
          email: string
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          source?: string | null
          status?: Database["public"]["Enums"]["subscriber_status"]
          tags?: string[]
          unsubscribed_at?: string | null
        }
        Update: {
          bounce_count?: number
          click_count?: number
          created_at?: string
          email?: string
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          source?: string | null
          status?: Database["public"]["Enums"]["subscriber_status"]
          tags?: string[]
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      subscription_invoices: {
        Row: {
          amount: number
          barion_payment_id: string | null
          barion_trace_id: string | null
          billing_period_end: string
          billing_period_start: string
          created_at: string
          currency: string
          id: string
          invoice_number: string | null
          invoice_provider: string | null
          invoice_url: string | null
          is_renewal: boolean
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string
        }
        Insert: {
          amount: number
          barion_payment_id?: string | null
          barion_trace_id?: string | null
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          invoice_provider?: string | null
          invoice_url?: string | null
          is_renewal?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string
        }
        Update: {
          amount?: number
          barion_payment_id?: string | null
          barion_trace_id?: string | null
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          invoice_provider?: string | null
          invoice_url?: string | null
          is_renewal?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "shop_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payment_events: {
        Row: {
          amount: number | null
          barion_payment_id: string | null
          barion_status: string | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          invoice_id: string | null
          metadata: Json
          subscription_id: string
        }
        Insert: {
          amount?: number | null
          barion_payment_id?: string | null
          barion_status?: string | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          subscription_id: string
        }
        Update: {
          amount?: number | null
          barion_payment_id?: string | null
          barion_status?: string | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payment_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "subscription_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payment_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "shop_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_review_stats: {
        Row: {
          average_rating: number | null
          five_star: number | null
          four_star: number | null
          one_star: number | null
          product_id: string | null
          review_count: number | null
          three_star: number | null
          two_star: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_agency_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "admin" | "agency_viewer"
      billing_cycle: "monthly" | "annual"
      discount_type: "percentage" | "fixed"
      invoice_status: "pending" | "paid" | "failed" | "refunded"
      order_status:
        | "draft"
        | "awaiting_payment"
        | "paid"
        | "processing"
        | "shipped"
        | "cancelled"
        | "refunded"
      payment_method: "barion" | "cod"
      review_status: "pending" | "approved" | "rejected"
      subscriber_status:
        | "subscribed"
        | "unsubscribed"
        | "bounced"
        | "complained"
      subscription_status:
        | "active"
        | "past_due"
        | "cancelled"
        | "trialing"
        | "suspended"
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
      app_role: ["customer", "admin", "agency_viewer"],
      billing_cycle: ["monthly", "annual"],
      discount_type: ["percentage", "fixed"],
      invoice_status: ["pending", "paid", "failed", "refunded"],
      order_status: [
        "draft",
        "awaiting_payment",
        "paid",
        "processing",
        "shipped",
        "cancelled",
        "refunded",
      ],
      payment_method: ["barion", "cod"],
      review_status: ["pending", "approved", "rejected"],
      subscriber_status: [
        "subscribed",
        "unsubscribed",
        "bounced",
        "complained",
      ],
      subscription_status: [
        "active",
        "past_due",
        "cancelled",
        "trialing",
        "suspended",
      ],
    },
  },
} as const
