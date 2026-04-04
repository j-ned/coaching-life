import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

// ─── Users ─────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  password: text('password').notNull(),
  role: text('role').notNull().default('user'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Appointments ──────────────────────────────────────────────────────────

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  client_name: text('client_name').notNull(),
  client_email: text('client_email').notNull(),
  client_phone: text('client_phone').notNull(),
  coaching_type: text('coaching_type').notNull(),
  appointment_date: text('appointment_date').notNull(),
  appointment_time: text('appointment_time').notNull(),
  duration: integer('duration').notNull(),
  message: text('message').default(''),
  status: text('status').notNull().default('pending'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Disabled Dates ────────────────────────────────────────────────────────

export const disabled_dates = pgTable('disabled_dates', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: text('date').notNull().unique(),
  reason: text('reason'),
});

// ─── Messages ──────────────────────────────────────────────────────────────

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sender_name: text('sender_name').notNull(),
  sender_email: text('sender_email').notNull(),
  subject: text('subject').notNull().default(''),
  content: text('content').notNull(),
  status: text('status').notNull().default('unread'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Pages (CMS) ───────────────────────────────────────────────────────────

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  introduction: text('introduction').notNull().default(''),
  section_title: text('section_title').notNull().default(''),
  items: jsonb('items').notNull().default([]),
  extra_text: text('extra_text'),
  image_url: text('image_url'),
  image_alt: text('image_alt').notNull().default(''),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Site Settings ─────────────────────────────────────────────────────────

export const site_settings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Page Visits ───────────────────────────────────────────────────────────

export const page_visits = pgTable('page_visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  page_path: text('page_path').notNull(),
  visited_at: timestamp('visited_at', { withTimezone: true }).defaultNow().notNull(),
  referrer: text('referrer'),
  user_agent: text('user_agent'),
});

// ─── Inferred types ────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type DisabledDate = typeof disabled_dates.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type SiteSetting = typeof site_settings.$inferSelect;
export type PageVisit = typeof page_visits.$inferSelect;
