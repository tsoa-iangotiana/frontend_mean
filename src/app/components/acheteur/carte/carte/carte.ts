import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

export interface PositionLivraison {
  lat: number; lng: number; commandeId: string;
}

export type MapMode = 'carte' | 'satellite';

@Component({
  selector:        'app-livraison-carte',
  standalone:      true,
  imports:         [CommonModule, FormsModule],
  templateUrl:     './carte.html',
  styleUrls:       ['./carte.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LivraisonCarteComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input()  commandeId = '';
  @Output() fermee            = new EventEmitter<void>();
  @Output() positionConfirmee = new EventEmitter<PositionLivraison>();

  @ViewChild('mapIframe') mapIframe!: ElementRef<HTMLIFrameElement>;

  positionSelectionnee: { lat: number; lng: number } | null = null;
  enLocalisation = false;
  iframeChargee  = false;
  mode: MapMode  = 'carte';

  latInput: number | null = null;
  lngInput: number | null = null;
  coordError = '';

  // ── [AJOUT] Champ adresse pour recherche via Nominatim (OpenStreetMap) ──
  adresseInput: string = '';

  // Ajouter une propriété pour la distance calculée
  distanceCalculee: number | null = null;

  private currentLat = -18.8792;
  private currentLng =  47.5079;
  private viewReady  = false;
  zoomTimeout: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.rechargerIframe(this.currentLat, this.currentLng);
    this.localiserUtilisateur();
  }

  ngOnDestroy(): void {
    if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
  }

  // ── Construction URL Google Maps Embed ───────────────────────────
  // Format maps?q= : épingle seule (avant géoloc)
  // Format saddr/daddr : deux épingles + tracé entre positionInitiale et position actuelle
  private buildUrl(lat: number, lng: number): string {
    const mapType  = this.mode === 'satellite' ? 'k' : 'm';
    const origine  = this.positionInitiale;
    const memePosition = origine.lat === lat && origine.lng === lng;

    if (!memePosition) {
      // [AJOUT] Deux marqueurs + tracé : vert sur positionInitiale, rouge sur position actuelle
      return (
        `https://maps.google.com/maps` +
        `?saddr=${origine.lat},${origine.lng}` +
        `&daddr=${lat},${lng}` +
        `&t=${mapType}` +
        `&output=embed` +
        `&hl=fr`
      );
    }

    // Fallback : une seule épingle (chargement initial avant géoloc)
    return (
      `https://maps.google.com/maps` +
      `?q=${lat},${lng}` +
      `&z=17` +
      `&t=${mapType}` +
      `&output=embed` +
      `&hl=fr`
    );
  }

  private rechargerIframe(lat: number, lng: number): void {
    if (!this.viewReady) return;
    this.iframeChargee = false;
    this.cdr.markForCheck();
    this.mapIframe.nativeElement.src = this.buildUrl(lat, lng);
  }

  onIframeLoaded(): void {
    this.iframeChargee = true;
    this.cdr.markForCheck();
  }

  setMode(mode: MapMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.rechargerIframe(this.currentLat, this.currentLng);
  }

  // ── Géolocalisation ───────────────────────────────────────────────
  localiserUtilisateur(): void {
    if (!navigator.geolocation) return;
    this.enLocalisation = true;
    this.cdr.markForCheck();

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.appliquerPosition(coords.latitude, coords.longitude);
        this.enLocalisation = false;
        this.cdr.markForCheck();
      },
      (err) => {
        console.warn('Géolocalisation indisponible :', err.message);
        this.enLocalisation = false;
        this.cdr.markForCheck();
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  // ── [AJOUT] Géocodage adresse → lat/lng via Nominatim (OpenStreetMap) ──
  // Appelle l'API gratuite Nominatim, récupère lat/lng du premier résultat,
  // puis appelle appliquerPosition() exactement comme "Ma position" le ferait.
  async rechercherAdresse(): Promise<void> {
    if (!this.adresseInput.trim()) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search`
        + `?q=${encodeURIComponent(this.adresseInput)}`
        + `&format=json&limit=1`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const data = await res.json();
      if (!data.length) {
        this.coordError = 'Adresse introuvable.';
        this.cdr.markForCheck();
        return;
      }
      this.coordError = '';
      this.appliquerPosition(parseFloat(data[0].lat), parseFloat(data[0].lon));
    } catch {
      this.coordError = 'Erreur de recherche d\'adresse.';
      this.cdr.markForCheck();
    }
  }

  // ── Saisie manuelle ───────────────────────────────────────────────
  onLatChange(): void { this.coordError = ''; }
  onLngChange(): void { this.coordError = ''; }

  validerCoordonnees(): void {
    if (this.latInput == null || this.lngInput == null) {
      this.coordError = 'Veuillez renseigner latitude et longitude.';
      this.cdr.markForCheck(); return;
    }
    const lat = Number(this.latInput);
    const lng = Number(this.lngInput);
    if (isNaN(lat) || isNaN(lng))   { this.coordError = 'Coordonnées invalides.';  this.cdr.markForCheck(); return; }
    if (lat < -90  || lat > 90)     { this.coordError = 'Latitude : −90 à 90.';   this.cdr.markForCheck(); return; }
    if (lng < -180 || lng > 180)    { this.coordError = 'Longitude : −180 à 180.'; this.cdr.markForCheck(); return; }
    this.coordError = '';
    this.appliquerPosition(lat, lng);
  }

  // ── [MODIFIÉ] appliquerPosition met à jour lat/lng ET récupère l'adresse
  // via Nominatim reverse geocoding pour remplir adresseInput automatiquement
  private appliquerPosition(lat: number, lng: number): void {
    this.currentLat = lat;
    this.currentLng = lng;
    this.positionSelectionnee = { lat, lng };
    this.latInput = lat;
    this.lngInput = lng;
    this.rechargerIframe(lat, lng);

    // Calculer la distance avec la position initiale
    this.distanceCalculee = this.calculerDistance(
      this.positionInitiale.lat,
      this.positionInitiale.lng,
      lat,
      lng
    );

    // [AJOUT] Géocodage inverse : lat/lng → adresse lisible via Nominatim
    // Remplit adresseInput automatiquement (que ce soit "Ma position" ou saisie manuelle)
    this.obtenirAdresse(lat, lng);
  }

  // [AJOUT] Appel Nominatim reverse geocoding pour obtenir l'adresse depuis lat/lng
  private async obtenirAdresse(lat: number, lng: number): Promise<void> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse`
        + `?lat=${lat}&lon=${lng}&format=json`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const data = await res.json();
      if (data?.display_name) {
        this.adresseInput = data.display_name;
        this.cdr.markForCheck();
      }
    } catch {
      // Silencieux — l'adresse reste vide si la requête échoue
    }
  }

  copierCoordonnees(): void {
    if (!this.positionSelectionnee) return;
    const { lat, lng } = this.positionSelectionnee;
    navigator.clipboard?.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  }

  confirmerPosition(): void {
    if (!this.positionSelectionnee) return;
    this.positionConfirmee.emit({ ...this.positionSelectionnee, commandeId: this.commandeId });
    this.fermer();
  }

  // Réinitialiser la distance quand on ferme
  fermer(): void {
    this.fermee.emit();
    this.distanceCalculee = null;
  }


  @Input() positionInitiale: { lat: number; lng: number; adresse?: string } = environment.positionInitiale; // Valeur par défaut depuis l'environnement

  // Ajouter cette fonction de calcul de distance (formule de Haversine)
  private calculerDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(valeur: number): number {
    return valeur * Math.PI / 180;
  }
}
