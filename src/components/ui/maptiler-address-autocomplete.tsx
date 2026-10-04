"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { Location } from "@/components/ui/iconsax";
import { fieldClass } from "@/components/ui/form-styles";

type Coordinates = [number, number];

type MapTilerFeature = {
  id: string;
  place_name?: string;
  text?: string;
  center?: Coordinates;
};

type MapTilerResponse = {
  features?: MapTilerFeature[];
};

type MapTilerAddressAutocompleteProps = {
  id: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

function createBrandMarker() {
  const element = document.createElement("div");
  element.className = "grid size-10 place-items-center rounded-full border-4 border-white bg-ink text-white shadow-xl";
  element.innerHTML = '<span style="display:block;width:10px;height:10px;border-radius:9999px;background:#ff4f93"></span>';
  return element;
}

export function MapTilerAddressAutocomplete({
  id,
  name = "locationAddress",
  defaultValue = "",
  placeholder,
  className = "",
  required = false,
}: MapTilerAddressAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim() ?? "";
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<MapTilerFeature[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<Coordinates | null>(null);
  const [userCenter, setUserCenter] = useState<Coordinates | null>(null);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const selectedCenterRef = useRef<Coordinates | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSearch = apiKey.length > 0;
  const normalizedQuery = useMemo(() => query.trim(), [query]);
  selectedCenterRef.current = selectedCenter;

  const reverseGeocode = useCallback(async (center: Coordinates) => {
    if (!apiKey) return;
    const params = new URLSearchParams({ key: apiKey, language: "vi", limit: "1" });
    const response = await fetch(
      `https://api.maptiler.com/geocoding/${center[0]},${center[1]}.json?${params.toString()}`
    );
    if (!response.ok) return;
    const data = (await response.json()) as MapTilerResponse;
    const feature = data.features?.[0];
    const value = feature?.place_name || feature?.text;
    if (value) setQuery(value);
  }, [apiKey]);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Thiết bị không hỗ trợ GPS.");
      return;
    }

    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const center: Coordinates = [coords.longitude, coords.latitude];
        setUserCenter(center);
        setSelectedCenter(center);
        setOpen(false);
        await reverseGeocode(center);
        setLocating(false);
      },
      () => {
        setLocationError("Không lấy được vị trí. Hãy bật quyền vị trí cho trình duyệt.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [reverseGeocode]);

  useEffect(() => {
    if (!navigator.permissions || !navigator.geolocation) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(({ coords }) => {
          setUserCenter([coords.longitude, coords.latitude]);
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!canSearch || normalizedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          key: apiKey,
          autocomplete: "true",
          fuzzyMatch: "true",
          limit: "8",
          language: "vi,en",
          country: "vn",
        });
        if (userCenter) params.set("proximity", `${userCenter[0]},${userCenter[1]}`);

        const response = await fetch(
          `https://api.maptiler.com/geocoding/${encodeURIComponent(normalizedQuery)}.json?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`MapTiler geocoding failed: ${response.status}`);
        const data = (await response.json()) as MapTilerResponse;
        setSuggestions((data.features ?? []).filter((feature) => feature.place_name || feature.text));
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      }
    }, 240);

    return () => window.clearTimeout(timeout);
  }, [apiKey, canSearch, normalizedQuery, userCenter]);

  const hasSelectedCenter = selectedCenter !== null;

  useEffect(() => {
    const initialCenter = selectedCenterRef.current;
    if (!apiKey || !hasSelectedCenter || !initialCenter || !mapContainerRef.current) return;
    let disposed = false;

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            "maptiler-streets": {
              type: "raster",
              tiles: [
                `https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=${encodeURIComponent(apiKey)}`,
              ],
              tileSize: 256,
              attribution: "© MapTiler © OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "maptiler-streets",
              type: "raster",
              source: "maptiler-streets",
            },
          ],
        },
        center: initialCenter,
        zoom: 16.2,
        pitch: 18,
        attributionControl: false,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const marker = new maplibregl.Marker({ element: createBrandMarker(), draggable: true })
        .setLngLat(initialCenter)
        .addTo(map);
      marker.on("dragend", () => {
        const next = marker.getLngLat();
        const center: Coordinates = [next.lng, next.lat];
        setSelectedCenter(center);
        void reverseGeocode(center);
      });
      markerRef.current = marker;
    });

    return () => {
      disposed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [apiKey, hasSelectedCenter, reverseGeocode]);

  useEffect(() => {
    if (!selectedCenter || !mapRef.current) return;
    markerRef.current?.setLngLat(selectedCenter);
    mapRef.current.flyTo({
      center: selectedCenter,
      zoom: 16.2,
      pitch: 18,
      duration: 650,
      essential: true,
    });
  }, [selectedCenter]);

  function selectSuggestion(feature: MapTilerFeature) {
    const typedHasHouseNumber = /^\s*\d/.test(query);
    const resultHasHouseNumber = /^\s*\d/.test(feature.text || feature.place_name || "");
    const value = typedHasHouseNumber && !resultHasHouseNumber
      ? query.trim()
      : feature.place_name || feature.text || query;
    setQuery(value);
    setOpen(false);
    setSuggestions([]);
    if (feature.center) setSelectedCenter(feature.center);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Location
          size={17}
          variant="Linear"
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-secondary"
        />
        <input
          id={id}
          name={name}
          required={required}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedCenter(null);
            if (event.target.value.trim().length >= 2) setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          placeholder={placeholder}
          className={`${fieldClass} pl-10 pr-24 ${className}`}
        />
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating || !canSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-pill bg-ink px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] text-white shadow-sm transition hover:bg-pink disabled:opacity-50"
        >
          {locating ? "Đang lấy..." : "Vị trí"}
        </button>
      </div>

      {locationError ? <p className="mt-1.5 text-[10px] font-bold text-error">{locationError}</p> : null}

      {open && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-r18 border border-stroke/70 bg-white shadow-xl">
          {suggestions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(feature)}
              className="flex w-full items-start gap-3 border-b border-stroke/50 px-3.5 py-3 text-left transition last:border-b-0 hover:bg-bg"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-sky text-ink">
                <Location size={15} variant="Bold" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-ink">{feature.text || feature.place_name}</span>
                <span className="mt-0.5 block line-clamp-2 text-[11px] font-semibold leading-relaxed text-secondary">
                  {feature.place_name}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selectedCenter ? (
        <div className="mt-2 overflow-hidden rounded-r18 border border-stroke/70 bg-white shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-stroke/60 bg-gradient-to-r from-sky via-white to-coral px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-secondary">Vị trí đã chọn</p>
              <p className="truncate text-xs font-extrabold text-ink">{query || "Đang xác định địa chỉ..."}</p>
            </div>
            <span className="shrink-0 rounded-pill bg-white/85 px-2.5 py-1 text-[9px] font-black uppercase text-secondary shadow-xs">
              Kéo pin để chỉnh
            </span>
          </div>
          <div ref={mapContainerRef} className="h-44 w-full" />
        </div>
      ) : null}

      {!canSearch ? (
        <p className="mt-1.5 text-[10px] font-semibold text-secondary">
          Thêm NEXT_PUBLIC_MAPTILER_API_KEY để bật gợi ý địa chỉ và bản đồ.
        </p>
      ) : null}
    </div>
  );
}
