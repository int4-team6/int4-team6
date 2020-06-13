import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import styles from './Map.module.css';
// import './Map.module.css';
import { useObserver } from 'mobx-react-lite';
import { useStore } from '../../hooks/useStore';

import Sidebar from '../Sidebar/index.jsx';
import Marker from '../Ancestor/index.jsx';

mapboxgl.accessToken =
  'pk.eyJ1IjoiY2FyZG9lbmxpZW4iLCJhIjoiY2tiODI3Znl4MDAyazJ4cXJ6cWNvdWswcSJ9.aVAGrbiyl5I5yb5KROaD7A';

const Map = () => {
  const mapContainerRef = useRef(null);
  const regionsJson = require('./../../data/region.json');

  const { ancestorStore } = useStore();
  const ancestors =  ancestorStore.ancestors;
  const [preview, setPreview] = useState(false);
  const [ancestor, setAncestor] = useState(null);
  const [loading, setLoading] = useState('loading')

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [13.356, 34.047],
      zoom: 1.5,
      attributionControl: false,
    });

    document.querySelector('.mapboxgl-ctrl-logo').style.display = 'none';
    map.dragRotate.disable();

    let hoveredRegionId = null;
    map.on('load', function () {
      map.addSource('regions', {
        type: 'geojson',
        data: regionsJson,
      });
      map.setMaxZoom(5);
      map.setMinZoom(1.5);

      map.addLayer({
        id: 'regions-layer',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': 'rgba(187, 114, 114, 0.4)',
          'fill-outline-color': 'rgba(187, 114, 114, 1)',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'zoom'], false],
            ['get', 'TRANSPARENCY'],
            ['get', 'TRANSPARENCY'],
          ],
        },
      });

      map.addLayer({
        id: 'region-borders',
        type: 'line',
        source: 'regions',
        layout: {},
        paint: {
          'line-color': 'rgba(187, 114, 114, 1)',
          'line-width': 2,
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'zoom'], false],
            0.4,
            ['get', 'TRANSPARENCY'],
          ],
        },
      });

      map.addLayer({
        id: 'region-info-percentage',
        source: 'regions',
        type: 'symbol',
        layout: {
          'text-field': [
            'concat',
            ['to-string', ['get', 'ROOTS_PERCENTAGE']],
            '%',
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 20,
        },
        paint: {
          'text-color': 'rgba(255,255,255,1)',
        },
      });

      map.addLayer({
        id: 'region-info-amount',
        source: 'regions',
        type: 'symbol',
        layout: {
          'text-field': [
            'concat',
            ['to-string', ['get', 'NUMBER_ANCESTORS']],
            ' ancestors',
          ],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 14,
          'text-offset': [0, 3],
        },
        paint: {
          'text-color': 'rgba(255,255,255,1)',
        },
      });
    });

    map.on('click', 'regions-layer', function (e) {
      map.flyTo({
        center: [
          e.features[0].properties.ZOOMX,
          e.features[0].properties.ZOOMY,
        ],
        essential: true,
        zoom: 5,
      });
      hoveredRegionId = e.features[0].id;
      map.setFeatureState(
        { source: 'regions', id: hoveredRegionId },
        { zoom: true }
      );
    });

    map.on('zoomend', function () {
      // if (map.getZoom() < 4) {
      //   map.removeFeatureState({
      //     source: 'regions',
      //   });
      // }

      ancestors.forEach((ancestor) => {
        // mapboxgl-marker
        if (map.getZoom() > 2) {
          createMarker(ancestor, map);
        } else if (map.getZoom() < 2) {
          removeMarkers();
        }
      });

    });

    map.on('mouseenter', 'regions-layer', function (e) {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'regions-layer', function () {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', 'markers', function (e) {
      map.getCanvas().style.cursor = 'pointer';
    });

    return () => map.remove();
  }, []);



  const removeMarkers = () => {
    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach((marker) => marker.parentNode.removeChild(marker));
  }



  const createMarker = (ancestor, map) => { 
    // CSS neemt niet?
    let content = `<img src="./assets/img/ancestor_george.png" className=${styles.popupImage} height="60px" width="60px" />
      <p className=${styles.test}>${ancestor.name}</p>
      <p>${ancestor.birthdate} - ${ancestor.deathdate}</p>`;
    let popup = new mapboxgl.Popup({ offset: 25 }).setHTML(content);
    const el = document.createElement('div');
    el.classList.add('marker'); // CSS neemt niet?
    // el.style.backgroundImage = 'url(./assets/img/loc_male.svg)';
    // el.style.width = '34px';
    // el.style.height = '38px';
    el.style.width = '10px';
    el.style.height = '10px';
    el.style.backgroundColor = 'red';
    el.style.borderRadius = '50%';

    let mapCoordinates = [];
    let mapLat = `${ancestor.mapLat}`;
    let mapLong = `${ancestor.mapLong}`;
    mapCoordinates.push(parseFloat(mapLong));
    mapCoordinates.push(parseFloat(mapLat));

    const marker = new mapboxgl.Marker(el)
      .setLngLat(mapCoordinates)
      .setPopup(popup)
      .addTo(map);
    const markerDiv = marker.getElement();

    const handleHoverMarker = (e) => {
      marker.togglePopup();
      let popup = document.getElementsByClassName('mapboxgl-popup')[0];
      if (popup) {
        let popupContent = popup.getElementsByClassName(
          'mapboxgl-popup-content'
        )[0];
        let popupTip = popup.getElementsByClassName(
          'mapboxgl-popup-tip'
        )[0];
        popupContent.classList.add(styles.popupContent);
        popupTip.classList.add(styles.popupTip);
      }
    };

    const handleClickAncestor = (e) => {
      const clickedAncestor = ancestorStore.getAncestorById(ancestor.id);
      setAncestor(clickedAncestor);
      setPreview(true);
    };
      
    markerDiv.addEventListener('mouseenter', handleHoverMarker);
    markerDiv.addEventListener('mouseleave', () => marker.togglePopup());
    markerDiv.addEventListener('click', handleClickAncestor);
}





  return useObserver(() => (
    <>
      <Sidebar
        type={'preview'}
        content={ancestor}
        toggle={preview}
        setToggle={setPreview}
      />

      <div className={styles.mapContainer} ref={mapContainerRef} />
    </>
  ));
};

export default Map;
