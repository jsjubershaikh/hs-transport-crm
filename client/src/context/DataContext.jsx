import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { yearApi, routeApi, busApi } from '../api/endpoints.js';
import { useAuth } from './AuthContext.jsx';
import { useUI } from './UIContext.jsx';

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

/**
 * Loads reference data shared across pages (academic years, routes, buses) once
 * the user is authenticated, and keeps the selected academic year in sync.
 * Per-resource hooks (useStudents, useFees…) fetch their own filtered data.
 */
export function DataProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { selectedYearId, setSelectedYearId } = useUI();

  const [years, setYears] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadYears = useCallback(async () => {
    const data = await yearApi.list();
    setYears(data || []);
    return data;
  }, []);

  const loadRoutes = useCallback(async () => {
    const data = await routeApi.list();
    setRoutes(data || []);
    return data;
  }, []);

  const loadBuses = useCallback(async () => {
    const data = await busApi.list();
    setBuses(data || []);
    return data;
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadYears(), loadRoutes(), loadBuses()]);
  }, [loadYears, loadRoutes, loadBuses]);

  useEffect(() => {
    if (!isAuthenticated) {
      setYears([]);
      setRoutes([]);
      setBuses([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    Promise.allSettled([loadYears(), loadRoutes(), loadBuses()]).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, loadYears, loadRoutes, loadBuses]);

  // Default the selected year to the current academic year once years load.
  useEffect(() => {
    if (!years.length) return;
    const stillValid = years.some((y) => String(y._id) === String(selectedYearId));
    if (!selectedYearId || !stillValid) {
      const current = years.find((y) => y.isCurrent) || years[0];
      if (current) setSelectedYearId(String(current._id));
    }
  }, [years, selectedYearId, setSelectedYearId]);

  const currentYear = years.find((y) => y.isCurrent) || null;
  const selectedYear = years.find((y) => String(y._id) === String(selectedYearId)) || currentYear;

  const value = {
    years, routes, buses, loading,
    currentYear, selectedYear,
    loadYears, loadRoutes, loadBuses, reloadAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
