import { useContext } from 'react';
import ThemeContext from '../context/ThemeContext';

/** Current theme plus preview/reload helpers — see context/ThemeContext.jsx. */
const useTheme = () => useContext(ThemeContext);

export default useTheme;
