import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import EntranceSplash from '../components/EntranceSplash';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Student Nav
import StudentTabs from './StudentTabs';
import VideoPlayerScreen from '../screens/student/VideoPlayerScreen';
import ExamTakingScreen from '../screens/student/ExamTakingScreen';
import ExamResultScreen from '../screens/student/ExamResultScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminVideoUploadScreen from '../screens/admin/AdminVideoUploadScreen';
import AdminExamBuilderScreen from '../screens/admin/AdminExamBuilderScreen';
import AdminStudentsScreen from '../screens/admin/AdminStudentsScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <EntranceSplash message="جاري تجهيز المنصة التعليمية..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      {!token || !user ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        // App Stack (Both Students and Admin)
        <>
          <Stack.Screen name="StudentTabs" component={StudentTabs} />
          {/* Aliases for direct navigation to student tabs from anywhere in the stack */}
          <Stack.Screen name="Home" component={StudentTabs} />
          <Stack.Screen name="Lessons" component={StudentTabs} />
          <Stack.Screen name="Exams" component={StudentTabs} />
          <Stack.Screen name="Profile" component={StudentTabs} />

          <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
          <Stack.Screen name="ExamTaking" component={ExamTakingScreen} />
          <Stack.Screen name="ExamResult" component={ExamResultScreen} />

          {/* Admin Navigation Screens (Protected inside same app) */}
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <Stack.Screen name="AdminVideoUpload" component={AdminVideoUploadScreen} />
          <Stack.Screen name="AdminExamBuilder" component={AdminExamBuilderScreen} />
          <Stack.Screen name="AdminStudents" component={AdminStudentsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

