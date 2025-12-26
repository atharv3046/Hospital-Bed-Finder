const { createClient } = require('@supabase/supabase-js');
const url = 'https://dqntsaynyheialkhzegf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbnRzYXlueWhlaWFsa2h6ZWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzA5ODcsImV4cCI6MjA3ODIwNjk4N30.jjo8tgku7OQ_hhcqEDTkwOovDS6T1AyytD-HibPSoVo';
const supabase = createClient(url, key);

async function getColumns() {
    const { data, error } = await supabase.from('hospitals').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('No data found');
    }
}

getColumns();
