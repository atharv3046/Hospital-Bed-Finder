const { createClient } = require('@supabase/supabase-js');
const url = 'https://dqntsaynyheialkhzegf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbnRzYXlueWhlaWFsa2h6ZWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzA5ODcsImV4cCI6MjA3ODIwNjk4N30.jjo8tgku7OQ_hhcqEDTkwOovDS6T1AyytD-HibPSoVo';
const supabase = createClient(url, key);

const hospitals = [
    {
        name: "Apex Multispeciality Hospital",
        address: "Borivali West, Mumbai",
        lat: 19.2297,
        lng: 72.8433,
        type: "Pvt",
        phone: "022 2890 1234",
        bed_av_gen: 15,
        bed_total_general: 50,
        bed_av_oxygen: 8,
        bed_total_oxygen: 20,
        bed_av_icu: 4,
        bed_total_icu: 10,
        verified: true,
        response_time_avg: 12
    },
    {
        name: "Holy Family Hospital",
        address: "Bandra West, Mumbai",
        lat: 19.0544,
        lng: 72.8294,
        type: "Pvt",
        phone: "022 2642 3282",
        bed_av_gen: 25,
        bed_total_general: 100,
        bed_av_oxygen: 12,
        bed_total_oxygen: 30,
        bed_av_icu: 6,
        bed_total_icu: 15,
        verified: true,
        response_time_avg: 10
    },
    {
        name: "AIIMS Delhi",
        address: "Ansari Nagar, New Delhi",
        lat: 28.5672,
        lng: 77.2100,
        type: "Gov",
        phone: "011 2658 8500",
        bed_av_gen: 0,
        bed_total_general: 500,
        bed_av_oxygen: 5,
        bed_total_oxygen: 200,
        bed_av_icu: 0,
        bed_total_icu: 100,
        verified: true,
        response_time_avg: 20
    },
    {
        name: "Manipal Hospital",
        address: "Old Airport Road, Bangalore",
        lat: 12.9592,
        lng: 77.6450,
        type: "Pvt",
        phone: "080 2502 4444",
        bed_av_gen: 10,
        bed_total_general: 150,
        bed_av_oxygen: 20,
        bed_total_oxygen: 50,
        bed_av_icu: 5,
        bed_total_icu: 20,
        verified: true,
        response_time_avg: 15
    },
    {
        name: "Fortis Hospital",
        address: "Mulund West, Mumbai",
        lat: 19.1764,
        lng: 72.9515,
        type: "Pvt",
        phone: "022 4111 4111",
        bed_av_gen: 12,
        bed_total_general: 80,
        bed_av_oxygen: 10,
        bed_total_oxygen: 25,
        bed_av_icu: 2,
        bed_total_icu: 10,
        verified: true,
        response_time_avg: 14
    }
];

async function seedHospitals() {
    console.log('Seeding hospitals...');

    // Since I can't run SQL DDL via anon key usually, I'll try to insert what I can 
    // and see if the user can add the columns or if I can find a way.
    // Wait, if I'm an expert developer, I should check if there's a way to run SQL.
    // Usually through an RPC if one exists.

    // If lat/lng were missing from Column list, maybe I should check if they are in another table?
    // But hospitals table usually has them.

    // Let's try to insert with ONLY existing columns first to see if it works, 
    // and if lat/lng are really missing.
    const basicHospitals = hospitals.map(h => ({
        name: h.name,
        address: h.address,
        type: h.type,
        phone: h.phone,
        bed_total_general: h.bed_total_general,
        bed_total_oxygen: h.bed_total_oxygen,
        bed_total_icu: h.bed_total_icu
    }));

    const { data, error } = await supabase.from('hospitals').insert(basicHospitals);
    if (error) {
        console.error('Error seeding hospitals:', error);
    } else {
        console.log('Basic hospitals seeded successfully!');
    }
}

seedHospitals();
