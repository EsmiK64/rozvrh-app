import React from 'react';
import { View, Button } from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <View>
      <Button
        title="Go to Select"
        onPress={() => navigation.navigate('Select')}
      />
    </View>
  );
};

export default HomeScreen;