"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "./client";

type CountryOpt = { code: string; name: string; region: string; jobs: number };
type CityOpt = { name: string; jobs: number; major: boolean };

export const REMOTE_ANYWHERE = "REMOTE";

export type LocationValue = { country: string; city: string; includeRemote: boolean };

const REGION_ORDER = ["Asia", "Middle East", "Europe", "North America", "Latin America", "Oceania", "Africa"];

/** Country → city dropdowns backed by /api/jobs/locations (with live counts). */
export function LocationPicker({ value, onChange }: { value: LocationValue; onChange: (v: LocationValue) => void }) {
  const [countries, setCountries] = useState<CountryOpt[]>([]);
  const [remoteCount, setRemoteCount] = useState(0);
  const [cities, setCities] = useState<CityOpt[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const hasCountry = value.country && value.country !== REMOTE_ANYWHERE;

  useEffect(() => {
    api<{ countries: CountryOpt[]; remote: number }>("/api/jobs/locations")
      .then((r) => {
        setCountries(r.countries);
        setRemoteCount(r.remote);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasCountry) {
      setCities([]);
      return;
    }
    let live = true;
    setLoadingCities(true);
    api<{ cities: CityOpt[] }>(`/api/jobs/locations?country=${value.country}`)
      .then((r) => live && setCities(r.cities))
      .catch(() => live && setCities([]))
      .finally(() => live && setLoadingCities(false));
    return () => {
      live = false;
    };
  }, [value.country, hasCountry]);

  // Countries with listings go in a "Has jobs" group at the top.
  const { withJobs, byRegion } = useMemo(() => {
    const withJobs = countries.filter((c) => c.jobs > 0).sort((a, b) => b.jobs - a.jobs);
    const byRegion = REGION_ORDER.map((r) => ({ region: r, list: countries.filter((c) => c.region === r) }));
    return { withJobs, byRegion };
  }, [countries]);

  const label = (c: CountryOpt) => (c.jobs ? `${c.name} (${c.jobs})` : c.name);
  const countryName = countries.find((c) => c.code === value.country)?.name ?? value.country;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <select
        aria-label="Country"
        className="input"
        value={value.country}
        onChange={(e) => onChange({ country: e.target.value, city: "", includeRemote: value.includeRemote })}
      >
        <option value="">Any country</option>
        <option value={REMOTE_ANYWHERE}>🌍 Remote (anywhere){remoteCount ? ` (${remoteCount})` : ""}</option>
        {withJobs.length > 0 && (
          <optgroup label="Countries with listings">
            {withJobs.map((c) => <option key={`j-${c.code}`} value={c.code}>{label(c)}</option>)}
          </optgroup>
        )}
        {byRegion.map(({ region, list }) => (
          <optgroup key={region} label={region}>
            {list.map((c) => <option key={c.code} value={c.code}>{label(c)}</option>)}
          </optgroup>
        ))}
      </select>
      <select
        aria-label="City"
        className="input"
        disabled={!hasCountry || loadingCities}
        value={value.city}
        onChange={(e) => onChange({ ...value, city: e.target.value })}
      >
        <option value="">{!hasCountry ? "Select a country first" : loadingCities ? "Loading cities…" : `All cities in ${countryName}`}</option>
        {cities.some((c) => c.jobs > 0) && (
          <optgroup label="Cities with listings">
            {cities.filter((c) => c.jobs > 0).map((c) => <option key={`j-${c.name}`} value={c.name}>{c.name} ({c.jobs})</option>)}
          </optgroup>
        )}
        <optgroup label="Major cities">
          {cities.filter((c) => c.jobs === 0).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </optgroup>
      </select>
      {hasCountry && (
        <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
          <input type="checkbox" className="accent-brand-600" checked={value.includeRemote} onChange={(e) => onChange({ ...value, includeRemote: e.target.checked })} />
          Also show remote roles open to {countryName} (worldwide or regional)
        </label>
      )}
    </div>
  );
}
