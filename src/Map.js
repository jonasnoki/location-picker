import React, {useRef, useEffect, useState} from 'react';
import {parkPolygon} from "./parkPolygon";
import {parkPolygonInverse} from "./parkPolygonInverse";
import pointInPolygon from "@turf/boolean-point-in-polygon";
import explode from "@turf/explode";
import nearestPoint from "@turf/nearest-point";
import mapboxgl from 'mapbox-gl';
import './Map.css';


// eslint-disable-next-line import/no-webpack-loader-syntax
mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default;
mapboxgl.accessToken = "pk.eyJ1Ijoiam9uYXNub2tpIiwiYSI6ImNrbWdraHRncDNmdTEyeWtuaW53bzUwaXMifQ._HxmVnG4t4A_1QEaddeAAQ";

const Map = () => {
    const mapContainerRef = useRef(null);

    const [lng, setLng] = useState(11.5899);
    const [lat, setLat] = useState(48.1496);
    const [zoom, setZoom] = useState(13.41);

    // Initialize map when component mounts
    useEffect(() => {
        const sw = new mapboxgl.LngLat(5, 40);
        const ne = new mapboxgl.LngLat(16, 55);
        const lngLatBounds = new mapboxgl.LngLatBounds(sw, ne);

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [lng, lat],
            zoom: zoom,
            maxBounds: lngLatBounds,
        });


        map.on('move', () => {
            setZoom(map.getZoom().toFixed(2));
        });

        map.on('load', function () {
            map.addSource('park', parkPolygonInverse);

            map.addLayer({
                'id': 'park',
                'type': 'fill',
                'source': 'park',
                'layout': {},
                'paint': {
                    'fill-color': '#088',
                    'fill-opacity': 0.6
                }
            });
        });


        const marker = new mapboxgl.Marker({
            draggable: true
        }).setLngLat([lng, lat]).addTo(map);


        const geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            showUserLocation: false
        });

        geolocateControl.on('geolocate', (e) => {
            const lngLat = {lng: e.coords.longitude, lat: e.coords.latitude};
            if (!isLngLatInPark(lngLat)) {
                window.alert("Your position is outside our delivery zone! :(")
            } else {
                marker.setLngLat(lngLat);
                setLng(lngLat.lng)
                setLat(lngLat.lat)
            }
        })

        map.addControl(
            geolocateControl
        );

        const findClosestLngLatInPark = (lngLat) => {
            const point = lngLatToPoint(lngLat);
            const vertices = explode(parkPolygon)
            const nearest = nearestPoint(point, vertices)
            return pointToLngLat(nearest);
        }

        marker.on('drag', () => {
            let lngLat = marker.getLngLat()
            if (!isLngLatInPark(lngLat)) {
                lngLat = findClosestLngLatInPark(lngLat);
                marker.setLngLat(lngLat)
            }
            setLng(lngLat.lng)
            setLat(lngLat.lat)

        })
        // marker.on('dragend', onDragEnd);
        const pointToLngLat = (point) => {
            return {
                lng: point.geometry.coordinates[0],
                lat: point.geometry.coordinates[1]
            }
        }

        const lngLatToPoint = (lngLat) => {
            return {
                "type": "Point",
                "coordinates": [lngLat.lng, lngLat.lat]
            }
        }

        const isLngLatInPark = (lngLat) => {
            const point = lngLatToPoint(lngLat);
            return pointInPolygon(point, parkPolygon)
        }

        map.on('click', (e) => {
            const lngLat = e.lngLat;
            if (isLngLatInPark(lngLat)) {
                setLng(lngLat.lng)
                setLat(lngLat.lat)
                marker.setLngLat(lngLat);
            }
        })


        // Clean up on unmount
        return () => map.remove();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <div className='sidebarStyle'>
                <div>
                    Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
                </div>
            </div>
            <div className='map-container' ref={mapContainerRef}/>
        </div>
    );
};

export default Map;
