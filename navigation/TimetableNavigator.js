import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen'; // Create this component
import SelectScreen from '../screens/SelectScreen'; // Create this component
import TimetableScreen from '../screens/TimetableScreen'; // Create this component

const Stack = createStackNavigator();

const TimetableNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Select" component={SelectScreen} />
      <Stack.Screen name="Timetable" component={TimetableScreen} />
    </Stack.Navigator>
  );
};

export default TimetableNavigator;