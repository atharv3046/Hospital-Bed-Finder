const { createClient } = require('@supabase/supabase-js');
const url = 'https://dqntsaynyheialkhzegf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbnRzYXlueWhlaWFsa2h6ZWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzA5ODcsImV4cCI6MjA3ODIwNjk4N30.jjo8tgku7OQ_hhcqEDTkwOovDS6T1AyytD-HibPSoVo';
const supabase = createClient(url, key);

async function checkSchema() {
    const { data: hospitals, error: hError } = await supabase.from('hospitals').select('*').limit(1);
    console.log('Hospitals Columns:', Object.keys(hospitals[0] || {}));

    const { data: bookings, error: bError } = await supabase.from('bookings').select('*').limit(1);
    if (!bError) console.log('Bookings Columns:', Object.keys(bookings[0] || {}));
    else console.log('Bookings error:', bError.message);
}

checkSchema();
