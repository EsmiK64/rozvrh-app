import React, { useEffect, useState } from 'react';
import { View, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Text } from '@rneui/themed';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SelectScreen = ({ navigation }) => {
  const [selectOptions, setSelectOptions] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isFormLoaded, setIsFormLoaded] = useState(false);

  useEffect(() => {
    const fetchClassOptions = async () => {
      try {
        const response = await fetch("https://rozvrh-bakalari.vercel.app/api/fetch-classes", { method: "POST" });
        if (!response.ok) {
          throw new Error(`Failed to fetch class options. Status: ${response.status}`);
        }

        const data = await response.json();
        setSelectOptions(data);
        setIsFormLoaded(true);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchClassOptions();
  }, []);


  const saveData = async () => {
    try {
      await AsyncStorage.setItem('selectedClass', selectedClass);
      console.log(selectedClass);
      console.log(await AsyncStorage.getItem('selectedClass'));
      navigation.navigate('GroupSelect');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  return (
    <View>
      {isFormLoaded ? (
        <View>
          {Array.isArray(selectOptions) && selectOptions.length > 0 ? (
            <Picker
              selectedValue={selectedClass}
              onValueChange={(itemValue) =>
                setSelectedClass(itemValue)
              }
            >
              {selectOptions.map((option, index) => (
                <Picker.Item key={index} label={option.label} value={option.value} />
              ))}
            </Picker>
          ) : (
            <Text>No options available</Text>
          )}
          <Button title="Continue" onPress={saveData} />
        </View>
      ) : (
        <View>
          <Text>Loading</Text>
        </View>
      )}

    </View>
  );
};

export default SelectScreen;