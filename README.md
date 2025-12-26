# 🏥 Hospital Bed Finder

A modern, real-time mobile application built with **React Native** and **Supabase** to help patients find and book hospital beds quickly during emergencies.

## 🚀 Features

- **Real-time Bed Availability:** View live updates on general, ICU, and oxygen bed availability across various hospitals.
- **Location-based Search:** Automatically finds the nearest hospitals using GPS.
- **Emergency Booking:** Quick request system for patients in urgent need.
- **Staff Dashboard:** Dedicated interface for hospital staff to manage bed counts and patient requests.
- **Distance Calculation:** Shows exactly how far each hospital is from your current location.
- **Detailed Hospital Profiles:** Contact information, address, and specific bed distributions.

## 🛠️ Tech Stack

- **Frontend:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Backend/Database:** [Supabase](https://supabase.com/) (PostgreSQL + Real-time)
- **Navigation:** [React Navigation v7](https://reactnavigation.org/)
- **Animations:** [Moti](https://moti.fyi/) & [Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Styling:** Vanilla CSS / React Native StyleSheet
- **Location Services:** `expo-location`

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/atharv3046/Hospital-Bed-Finder.git
    cd Hospital-Bed-Finder
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Start the development server:**
    ```bash
    npx expo start
    ```

## 📱 Screens

- **Home:** Overview and quick actions.
- **Hospital List:** Searchable and sortable list of all registered hospitals.
- **Hospital Details:** Comprehensive view of a single hospital.
- **Booking/Request:** Simplified form for bed requests.
- **Profile:** User settings and role management.

## 📄 License

This project is licensed under the **0BSD License**.