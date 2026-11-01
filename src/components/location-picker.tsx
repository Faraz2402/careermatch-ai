"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "./client";

type CountryOpt = { code: string; name: string; region: string; jobs: number };
type CityOpt = { name: string; jobs: number; major: boolean };
type RemoteOpts = { total: number; worldwide: number; countries: { code: string; name: string; jobs: number }[] };

export const REMOTE_ANYWHERE = "REMOTE";
/** With Remote chosen, the second dropdown's value for roles open to anyone, anywhere. */
export const REMOTE_WORLDWIDE = "WORLDWIDE";

export type LocationValue = { country: string; city: string; includeRemote: boolean };

const REGION_ORDER = ["Asia", "Middle East", "Europe", "North America", "Latin America", "Oceania", "Africa"];

/**
 * Country → city dropdowns backed by /api/jobs/locations (with live counts).
 * With Remote chosen, the second dropdown says who can take the role instead:
 * anyone worldwide, or someone in a given country.
 */
export function LocationPicker({ value, onChange }: { value: LocationValue; onChange: (v: LocationValue) => void }) {
  const [countries, setCountries] = useState<CountryOpt[]>([]);
  const [remoteCount, setRemoteCount] = useState(0);
  const [cities, setCities] = useState<CityOpt[]>([]);
  const [remote, setRemote] = useState<RemoteOpts | null>(null);
  const [loading, setLoading] = useState(false);
  const isRemote = value.country === REMOTE_ANYWHERE;
  const hasCountry = !!value.country && !isRemote;

  useEffect(() => {
    api<{ countries: CountryOpt[]; remote: number }>("/api/jobs/locations")
      .then((r) => {
        setCountries(r.countries);
        setRemoteCount(r.remote);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!value.country) {
      setCities([]);
      return;
    }
    let live = true;
    setLoading(true);
    const done = () => live && setLoading(false);
    if (isRemote)
      api<RemoteOpts>(`/api/jobs/locations?country=${REMOTE_ANYWHERE}`)
        .then((r) => live && setRemote(r))
        .catch(() => live && setRemote(null))
        .finally(done);
    else
      api<{ cities: CityOpt[] }>(`/api/jobs/locations?country=${value.country}`)
        .then((r) => live && setCities(r.cities))
        .catch(() => live && setCities([]))
        .finally(done);
    return () => {
      live = false;
    };
  }, [value.country, isRemote]);

  // Countries with listings go in a "Has jobs" group at the top.
  const { withJobs, byRegion } = useMemo(() => {
    const withJobs = countries.filter((c) => c.jobs > 0).sort((a, b) => b.jobs - a.jobs);
    const byRegion = REGION_ORDER.map((r) => ({ region: r, list: countries.filter((c) => c.region === r) }));
    return { withJobs, byRegion };
  }, [countries]);

  const label = (c: CountryOpt) => (c.jobs ? `${c.name} (${c.jobs})` : c.name);
  const countryName = countries.find((c) => c.code === value.country)?.name ?? value.country;
  const count = (n: number) => ` (${n})`;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <select
        aria-label="Country"
        className="input"
        value={value.country}
        onChange={(e) => onChange({ country: e.target.value, city: "", includeRemote: value.includeRemote })}
      >
        <option value="">Any country</option>
        <option value={REMOTE_ANYWHERE}>🌍 Remote{remoteCount ? count(remoteCount) : ""}</option>
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
      {isRemote ? (
        <select aria-label="Remote roles open to" className="input" disabled={loading} value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })}>
          <option value="">{loading ? "Loading…" : `All remote roles${remote ? count(remote.total) : ""}`}</option>
          {remote && (
            <>
              <option value={REMOTE_WORLDWIDE}>🌐 Work from anywhere in the world{count(remote.worldwide)}</option>
              {remote.countries.length > 0 && (
                <optgroup label="Open to people in">
                  {remote.countries.map((c) => <option key={c.code} value={c.code}>{c.name}{count(c.jobs)}</option>)}
                </optgroup>
              )}
            </>
          )}
        </select>
      ) : (
        <select
          aria-label="City"
          className="input"
          disabled={!hasCountry || loading}
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
        >
          <option value="">{!hasCountry ? "All cities" : loading ? "Loading cities…" : `All cities in ${countryName}`}</option>
          {cities.some((c) => c.jobs > 0) && (
            <optgroup label="Cities with listings">
              {cities.filter((c) => c.jobs > 0).map((c) => <option key={`j-${c.name}`} value={c.name}>{c.name} ({c.jobs})</option>)}
            </optgroup>
          )}
          <optgroup label="Major cities">
            {cities.filter((c) => c.jobs === 0).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </optgroup>
        </select>
      )}
      {hasCountry && (
        <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
          <input type="checkbox" className="accent-brand-600" checked={value.includeRemote} onChange={(e) => onChange({ ...value, includeRemote: e.target.checked })} />
          Also show remote roles open to {countryName} (worldwide or regional)
        </label>
      )}
    </div>
  );
}
