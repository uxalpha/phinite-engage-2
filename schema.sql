-- Employee Brand Engagement Platform Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  grace_day_used BOOLEAN DEFAULT FALSE,
  grace_day_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('LIKE', 'COMMENT', 'REPOST', 'TAG', 'ORIGINAL_POST')),
  image_url TEXT NOT NULL,
  
  -- AI Verification Response Fields
  workflow_id TEXT,
  platform_detected TEXT,
  like_detected BOOLEAN DEFAULT FALSE,
  comment_detected BOOLEAN DEFAULT FALSE,
  repost_detected BOOLEAN DEFAULT FALSE,
  tag_detected BOOLEAN DEFAULT FALSE,
  original_post_detected BOOLEAN DEFAULT FALSE,
  primary_action TEXT,
  assigned_points INTEGER DEFAULT 0,
  action_confidence NUMERIC(3,2),
  duplicate_risk TEXT,
  
  -- Verification Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'manual_review')),
  points_awarded INTEGER DEFAULT 0,
  streak_multiplier NUMERIC(2,1) DEFAULT 1.0,
  notes TEXT,
  admin_notes TEXT,
  
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Monthly Points table
CREATE TABLE monthly_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  UNIQUE(user_id, month)
);

-- Admins table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_monthly_points_user_month ON monthly_points(user_id, month);
CREATE INDEX idx_monthly_points_month ON monthly_points(month);

-- Function to update user total points
CREATE OR REPLACE FUNCTION update_user_total_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' AND NEW.points_awarded > 0 THEN
    UPDATE users 
    SET total_points = total_points + NEW.points_awarded 
    WHERE id = NEW.user_id;
    
    -- Update monthly points
    INSERT INTO monthly_points (user_id, month, points)
    VALUES (NEW.user_id, TO_CHAR(NOW(), 'YYYY-MM'), NEW.points_awarded)
    ON CONFLICT (user_id, month) 
    DO UPDATE SET points = monthly_points.points + NEW.points_awarded;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update points when submission is verified
CREATE TRIGGER trigger_update_points
AFTER UPDATE ON submissions
FOR EACH ROW
WHEN (OLD.status != 'verified' AND NEW.status = 'verified')
EXECUTE FUNCTION update_user_total_points();

-- View for current month leaderboard
CREATE OR REPLACE VIEW current_month_leaderboard AS
SELECT 
  u.id,
  u.name,
  u.email,
  COALESCE(mp.points, 0) as points,
  RANK() OVER (ORDER BY COALESCE(mp.points, 0) DESC) as rank
FROM users u
LEFT JOIN monthly_points mp ON u.id = mp.user_id AND mp.month = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY points DESC;

-- Function to reset monthly points (run on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_points()
RETURNS void AS $$
BEGIN
  -- Archive is already in monthly_points table
  -- Just reset user total_points
  UPDATE users SET total_points = 0;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE users IS 'Registered users of the platform';
COMMENT ON TABLE submissions IS 'Proof submissions with AI verification results';
COMMENT ON TABLE monthly_points IS 'Historical record of monthly points per user';
COMMENT ON TABLE admins IS 'Admin users with special privileges';
