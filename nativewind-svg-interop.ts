import {cssInterop} from 'nativewind';
import {Svg, Path} from 'react-native-svg';

cssInterop(Path, {className: {target: true, nativeStyleToProp: {fill: true, stroke: true}}});
cssInterop(Svg, {className: {target: 'style', nativeStyleToProp: {width: true, height: true}}});
