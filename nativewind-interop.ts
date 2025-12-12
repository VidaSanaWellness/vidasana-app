import {cssInterop} from 'nativewind';
import {Svg, Path} from 'react-native-svg';
import * as Icons from '@expo/vector-icons';

cssInterop(Path, {className: {target: true, nativeStyleToProp: {fill: true, stroke: true}}});
cssInterop(Svg, {className: {target: 'style', nativeStyleToProp: {width: true, height: true}}});

Object.values(Icons).forEach((IconPack: any) => {
  typeof IconPack === 'function' &&
    cssInterop(IconPack, {className: {target: 'style', nativeStyleToProp: {width: true, color: true, height: true, fontSize: true}}});
});
