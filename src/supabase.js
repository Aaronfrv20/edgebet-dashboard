import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gezifqvginieabyftliy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlemlmcXZnaW5pZWFieWZ0bGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjY3MDcsImV4cCI6MjA5MzYwMjcwN30.HKYj_o3TtGmybGE9IygqqmL97QB8xyc2dXPAIqIJLYs'

export const supabase = createClient(supabaseUrl, supabaseKey)