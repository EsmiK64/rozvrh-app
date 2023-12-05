import React, { useEffect, useState } from 'react';
import { View, Button, Picker, Stack } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckBox } from '@rneui/themed';


const SelectScreen = ({ navigation }) => {
  const [selectElements, setSelectElements] = useState([]);
  const [checkboxElements, setCheckboxElements] = useState([]);
  const [groupData, setGroupData] = useState([]);

  const formData = [];

  const handleInputChange = (fieldName, value) => {
    if (formData.length > 0) {
      formData.forEach((group, index) => {
        const letter = (group.match(/[a-zA-Z]+/) || [""])[0];
        if (letter === fieldName) {
          formData[index] = value;
        } else {
          formData.push(value);
        }
      });
    } else {
      formData.push(value);
    }
    const uniqueFormData = formData.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    console.log(uniqueFormData);
    setGroupData(uniqueFormData);
  };  

  useEffect(() => {
    console.log("test log")
    const fetchTimetable = async () => {
      try {
        const selectedClass = await AsyncStorage.getItem('selectedClass');
        console.log(selectedClass);
        const response = await fetch(
          "https://rozvrh-bakalari.vercel.app/api/fetch-timetable",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ class: selectedClass }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const groups = [];

          for (const day of data.timetable) {
            for (const lessons of Object.values(day)) {
              for (const lesson of lessons) {
                const group = lesson.group;
                if (group) {
                  groups.push(group);
                }
              }
            }
          }
          let uniqueGroups = [...new Set(groups)];
          const groupsText = uniqueGroups.toString();

          const checkboxes = [];
          let selects = [];

          uniqueGroups.forEach((group) => {
            const option = [];
            const letter = (group.match(/[a-zA-Z]+/) || [""])[0];

            const regex = new RegExp(`${letter}\\d`, "g");
            let selectsArray = [...groupsText.matchAll(regex)].map(
              (match) => match[0]
            );

            if (group == "CM" || group == "DV") {
              selectsArray.push(group);
            }

            selectsArray = selectsArray.sort();

            console.log(selectsArray);

            selectsArray.forEach((groupFinal) => {
              option.push(<option value={groupFinal}>{groupFinal}</option>);
            });

            if (option.length === 1) {
              checkboxes.push(
                <CheckBox id={group} label={group} name={group} onValueChange={(value) => handleInputChange(group, value)}/>
              );
            } else {
              const selectId = letter;

              const push = (
                <Picker id={selectId} defaultValue="" key={selectId} onValueChange={(value) => handleInputChange(selectId, value)}>
                  <option></option>
                  {option}
                </Picker>
              );

              console.log(push);

              if (
                !selects.some(
                  (existingSelect) => existingSelect.props.id === selectId
                )
              ) {
                selects.push(push);
              }
            }
          });
          selects = selects.filter(
            (select, index, array) =>
              array.findIndex((s) => s.key === select.key) === index
          );
          setSelectElements(selects);
          setCheckboxElements(checkboxes);
        } else {
          console.log("fuckup");
        }
      } catch (error) {
        console.error(error);
      }
    }

    fetchTimetable();
  }, []);

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('groupsData', JSON.stringify(groupData));
      navigation.navigate('Timetable');
    } catch (error) {
      console.error('Error saving data:', error); 
    }
  };

  return (
    <View>
      <View>
        {selectElements}
      </View>
      <View>
        {checkboxElements}
      </View>
      <Button title="Generate Timetable" onPress={saveData} />
    </View>
  );
};

export default SelectScreen;