const { createClient } = require('@supabase/supabase-js');
const url = 'https://dqntsaynyheialkhzegf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbnRzYXlueWhlaWFsa2h6ZWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzA5ODcsImV4cCI6MjA3ODIwNjk4N30.jjo8tgku7OQ_hhcqEDTkwOovDS6T1AyytD-HibPSoVo';
const supabase = createClient(url, key);

async function seedFakeRequests() {
    console.log('Fetching user and hospitals...');

    // Get the first user profile to use as the "current user" for testing
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id').limit(1);
    if (pError || !profiles.length) {
        console.error('No profiles found to seed requests for.');
        return;
    }
    const userId = profiles[0].id;
    console.log('Using User ID:', userId);

    // Get some hospitals
    const { data: hospitals, error: hError } = await supabase.from('hospitals').select('id, name').limit(3);
    if (hError || !hospitals.length) {
        console.error('No hospitals found to link requests to.');
        return;
    }

    console.log('Inserting fake bookings...');
    const fakeBookings = [
        {
            user_id: userId,
            hospital_id: hospitals[0].id,
            bed_type: 'ICU',
            patient_name: 'Rahul Sharma',
            age: 45,
            contact_phone: '+91 9876543210',
            condition: 'Severe breathlessness, suspected pneumonia',
            status: 'PENDING'
        },
        {
            user_id: userId,
            hospital_id: hospitals[1 % hospitals.length].id,
            bed_type: 'GENERAL',
            patient_name: 'Anita Desai',
            age: 32,
            contact_phone: '+91 9123456789',
            condition: 'Post-operative recovery',
            status: 'CONFIRMED'
        }
    ];

    const { error: bError } = await supabase.from('bookings').insert(fakeBookings);
    if (bError) console.error('Error inserting bookings:', bError);
    else console.log('Fake bookings added!');

    console.log('Inserting fake emergency request...');
    const fakeEmergency = {
        user_id: userId,
        patient_name: 'Old Man (Unknown)',
        patient_age: '70',
        severity: 'Critical',
        nature_of_emergency: 'Possible Heart Attack / Cardiac Arrest',
        location_text: 'Gate No. 3, Central Park, near the fountain',
        contact_number: '+91 9988776655',
        status: 'OPEN'
    };

    const { error: eError } = await supabase.from('emergency_requests').insert(fakeEmergency);
    if (eError) console.error('Error inserting emergency:', eError);
    else console.log('Fake emergency request added!');

    console.log('Seeding complete!');
}

seedFakeRequests();
