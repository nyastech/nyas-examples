CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC(12,2),
  stage TEXT NOT NULL DEFAULT 'lead',
  contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  expected_close_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'todo',
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'open',
  contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  deal_id INT REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  deal_id INT REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
