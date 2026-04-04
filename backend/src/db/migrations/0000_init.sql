CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL DEFAULT '',
  "password" text NOT NULL,
  "role" text NOT NULL DEFAULT 'user',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_name" text NOT NULL,
  "client_email" text NOT NULL,
  "client_phone" text NOT NULL,
  "coaching_type" text NOT NULL,
  "appointment_date" text NOT NULL,
  "appointment_time" text NOT NULL,
  "duration" integer NOT NULL,
  "message" text DEFAULT '',
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "disabled_dates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date" text NOT NULL,
  "reason" text,
  CONSTRAINT "disabled_dates_date_unique" UNIQUE("date")
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sender_name" text NOT NULL,
  "sender_email" text NOT NULL,
  "subject" text NOT NULL DEFAULT '',
  "content" text NOT NULL,
  "status" text NOT NULL DEFAULT 'unread',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "introduction" text NOT NULL DEFAULT '',
  "section_title" text NOT NULL DEFAULT '',
  "items" jsonb NOT NULL DEFAULT '[]',
  "extra_text" text,
  "image_url" text,
  "image_alt" text NOT NULL DEFAULT '',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_visits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_path" text NOT NULL,
  "visited_at" timestamp with time zone DEFAULT now() NOT NULL,
  "referrer" text,
  "user_agent" text
);
