import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import SelectScreen from '../screens/SelectScreen';
import TimetableScreen from '../screens/TimetableScreen';
import GroupSelectScreen from '../screens/GroupSelectScreen';
const Stack = createStackNavigator();

const TimetableNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Select" component={SelectScreen} />
      <Stack.Screen name="Timetable" component={TimetableScreen} />
      <Stack.Screen name="GroupSelect" component={GroupSelectScreen} />
    </Stack.Navigator>
  );
};

export default TimetableNavigator;