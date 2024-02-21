import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@rneui/base';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({ navigation }) => {
  useEffect(() => {
    const checkSavedData = async () => {
      try {
        const selectedClass = await AsyncStorage.getItem('selectedClass');
        const selectedGroups = await AsyncStorage.getItem('groupsData');

        if (selectedClass !== null && selectedGroups !== null) {
          // Both selectedClass and selectedGroups are present
          navigation.navigate('Timetable');
        }
      } catch (error) {
        console.error('Error fetching saved data:', error);
      }
    };

    checkSavedData();
  }, [navigation]);

  return (
    <View>
      <Text style={styles.heading}>Rozvrh pro SPECIÁLNÍ ŠKOLU PRO SPECIÁLNÍ DĚTI</Text>
      <Button
        title="Go to Select"
        onPress={() => navigation.navigate('Select')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default HomeScreen;