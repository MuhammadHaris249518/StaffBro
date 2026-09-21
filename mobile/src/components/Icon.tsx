import { MaterialIcons } from "@expo/vector-icons";

import { colors } from "../theme/tokens";

type Props = {
  name: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 22, color = colors.primary }: Props) {
  return <MaterialIcons name={name} size={size} color={color} />;
}
