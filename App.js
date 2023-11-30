import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TimetableNavigator from './navigation/TimetableNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <TimetableNavigator />
    </NavigationContainer>
  );
}