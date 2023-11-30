import React, { useEffect, useState } from 'react';
import { View, Picker, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SelectScreen = ({ navigation }) => {
  const [selectOptionsHTML, setSelectOptionsHTML] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const fetchClassOptions = async () => {
      try {
        const response = await fetch(
          'https://bakalari.spse.cz/bakaweb/Timetable/Public/'
        );
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const selectElement = doc.getElementById('selectedClass');
        if (selectElement) {
          setSelectOptionsHTML(selectElement.innerHTML);
        }
      } catch (error) {
        console.error('Failed to fetch class options:', error);
      }
    };

    fetchClassOptions();
  }, []);

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('selectedClass', selectedClass);
      console.log(selectedClass);
      console.log(await AsyncStorage.getItem('selectedClass'));
      navigation.navigate('Timetable');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  return (
    <View>
      <Picker
        selectedValue={selectedClass}
        onValueChange={(itemValue) => setSelectedClass(itemValue)}
        dangerouslySetInnerHTML={{ __html: selectOptionsHTML }}
      >
      </Picker>
      <Button title="Generate Timetable" onPress={saveData} />
    </View>
  );
};

export default SelectScreen;