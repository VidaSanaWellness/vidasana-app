import {Image, Text, View} from 'react-native';

type AvatarProps = {name?: string; size?: number; className?: string; uri?: string | null};

const colorSet = [
  {bg: '#FFF9EB', text: '#FFB300'},
  {bg: '#FDEBFF', text: '#EE33FF'},
  {bg: '#FFEBF1', text: '#FF3377'},
  {bg: '#EBEEFF', text: '#3358FF'},
];

export function Avatar({name = '', uri = null, size = 60, className}: AvatarProps) {
  const randomColor = colorSet[Math.floor(Math.random() * colorSet.length)];

  const getInitials = (fullName: string) => {
    if (!fullName.trim()) return 'N/A';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return (first + last).toUpperCase();
  };

  const initials = getInitials(name);

  const backgroundColor = randomColor.bg;
  const initialsColor = randomColor.text;

  return (
    <View
      style={{width: size, height: size, backgroundColor: backgroundColor}}
      className={`items-center justify-center overflow-hidden rounded-full ${className}`}>
      {uri ? (
        <Image source={{uri}} style={{width: size, height: size, borderRadius: size / 2}} />
      ) : (
        <Text className="font-nunito-bold" style={{fontSize: size * 0.4, color: initialsColor}}>
          {initials}
        </Text>
      )}
    </View>
  );
}
