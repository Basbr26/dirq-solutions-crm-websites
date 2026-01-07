import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) {
    env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL || '',
  env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkCalendarEvents() {
  // First get the admin user (you)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ Auth error:', authError);
    return;
  }

  console.log('✅ Checking events voor user:', user.email);
  console.log('');

  // 1. Check calendar_events
  console.log('📅 CALENDAR_EVENTS:');
  const { data: calendarEvents, error: calError } = await supabase
    .from('calendar_events')
    .select('id, title, event_type, start_time, end_time, google_event_id')
    .order('start_time', { ascending: false })
    .limit(10);

  if (calError) {
    console.error('Error:', calError);
  } else if (calendarEvents.length === 0) {
    console.log('  ✓ Geen calendar events gevonden');
  } else {
    calendarEvents.forEach(event => {
      console.log(`  - ${event.title} (${event.event_type})`);
      console.log(`    Start: ${event.start_time}`);
      console.log(`    Google ID: ${event.google_event_id || 'geen'}`);
      console.log(`    ID: ${event.id}`);
      console.log('');
    });
  }

  // 2. Check scheduled interactions
  console.log('📞 SCHEDULED INTERACTIONS:');
  const { data: scheduledInt, error: schedError } = await supabase
    .from('interactions')
    .select('id, subject, type, scheduled_at, status')
    .in('type', ['meeting', 'call', 'demo'])
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: false })
    .limit(10);

  if (schedError) {
    console.error('Error:', schedError);
  } else if (scheduledInt.length === 0) {
    console.log('  ✓ Geen scheduled interactions gevonden');
  } else {
    scheduledInt.forEach(int => {
      console.log(`  - ${int.subject} (${int.type})`);
      console.log(`    Scheduled: ${int.scheduled_at}`);
      console.log(`    Status: ${int.status}`);
      console.log(`    ID: ${int.id}`);
      console.log('');
    });
  }

  // 3. Check pending tasks
  console.log('✅ PENDING TASKS:');
  const { data: tasks, error: taskError } = await supabase
    .from('interactions')
    .select('id, subject, due_date, task_status')
    .eq('is_task', true)
    .eq('task_status', 'pending')
    .not('due_date', 'is', null)
    .order('due_date', { ascending: false })
    .limit(10);

  if (taskError) {
    console.error('Error:', taskError);
  } else if (tasks.length === 0) {
    console.log('  ✓ Geen pending tasks gevonden');
  } else {
    tasks.forEach(task => {
      console.log(`  - ${task.subject}`);
      console.log(`    Due: ${task.due_date}`);
      console.log(`    ID: ${task.id}`);
      console.log('');
    });
  }
}

checkCalendarEvents().catch(console.error);
