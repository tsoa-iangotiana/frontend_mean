import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfilService, Boutique, Categorie, Box } from '../../../services/boutique/profil/profil.service';
import { CategorieService } from '../../../services/admin/categorie/categorie.service';
import { AuthService, User } from '../../../services/auth';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './profil.html',
  styleUrls: ['./profil.css'],
})
export class Profil implements OnInit {
  // États
  loading = true;
  hasBoutique = false;
  isEditing = false;
  isCreating = false;
  
  // Données
  currentUser: User | null = null;
  boutique: Boutique | null = null;
  categoriesDisponibles: Categorie[] = [];
  
  // Formulaires
  boutiqueForm: FormGroup;
  photoPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  
  // Nouveau contact
  newContact: string = '';
  
  // Message d'erreur
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private profilService: ProfilService,
    private categorieService: CategorieService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🏗️ Constructeur Profil');
    this.boutiqueForm = this.createForm();
  }

  async ngOnInit() {
    console.log('🏁 Initialisation Profil');

    // ✅ PROTECTION 1 : Bloquer tout côté serveur
    if (!this.authService.isBrowser()) {
      console.log('🖥️ SSR - AUCUNE action');
      return;
    }

    // ✅ PROTECTION 2 : Vérification auth côté client
    console.log('🌐 Client détecté - Vérification auth');
    await this.authService.initializeAuth();

    if (!this.authService.isLoggedIn()) {
      console.log('🔒 Non authentifié - Redirection immédiate vers login');
      this.router.navigate(['/login']);
      return;
    }

    // ✅ Récupérer l'utilisateur connecté
    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Utilisateur connecté:', this.currentUser);
    
    if (this.currentUser) {
      this.verifierBoutique();
      this.chargerCategories();
    } else {
      console.error('❌ Impossible de récupérer l\'utilisateur connecté');
      this.loading = false;
      this.errorMessage = 'Erreur de session utilisateur';
      this.cdr.detectChanges();
    }
  }

  // Création du formulaire
  private createForm(): FormGroup {
    return this.fb.group({
      nom: ['', Validators.required],
      slogan: [''],
      description: [''],
      condition_vente: [''],
      contacts: this.fb.array([]),
      categories: [[]],
      profil_photo: ['']
    });
  }

  // Getter pour le FormArray des contacts
  get contactsFormArray(): FormArray {
    return this.boutiqueForm.get('contacts') as FormArray;
  }

  // Vérifier si le responsable a une boutique
  verifierBoutique(): void {
    if (!this.currentUser) {
      console.error('❌ verifierBoutique: utilisateur non défini');
      this.loading = false;
      return;
    }

    console.log('🔍 Vérification boutique pour responsable:', this.currentUser._id);
    
    this.profilService.checkResponsableBoutique(this.currentUser._id).subscribe({
      next: (response) => {
        console.log('✅ Réponse vérification:', response);
        this.hasBoutique = response.hasBoutique;
        
        if (this.hasBoutique && response.boutique) {
          this.boutique = response.boutique;
          console.log('🏪 Boutique trouvée:', this.boutique!.nom);
          this.chargerBoutiqueDansFormulaire();
        } else {
          console.log('📭 Aucune boutique trouvée pour ce responsable');
        }
        
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la vérification:', error);
        
        if (error.status === 401) {
          console.log('🔒 Token invalide/expiré - Déconnexion forcée');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        
        this.loading = false;
        this.errorMessage = 'Erreur lors de la vérification de la boutique';
        this.cdr.detectChanges();
      }
    });
  }

  // Charger les catégories disponibles
  chargerCategories(): void {
    console.log('📚 Chargement des catégories...');
    
    this.categorieService.getCategoriesValides().subscribe({
      next: (response) => {
        console.log('✅ Catégories reçues:', response);
        this.categoriesDisponibles = response.categories || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement catégories:', error);
        
        if (error.status === 401) {
          console.log('🔒 Token invalide/expiré - Déconnexion forcée');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        
        this.categoriesDisponibles = [];
      }
    });
  }

  // Charger la boutique dans le formulaire
  chargerBoutiqueDansFormulaire(): void {
    if (!this.boutique) return;

    console.log('📝 Chargement boutique dans formulaire:', this.boutique);

    this.boutiqueForm.patchValue({
      nom: this.boutique.nom,
      slogan: this.boutique.slogan || '',
      description: this.boutique.description || '',
      condition_vente: this.boutique.condition_vente || '',
      categories: this.boutique.categories || [],
      profil_photo: this.boutique.profil_photo || ''
    });

    // Vider le FormArray des contacts
    while (this.contactsFormArray.length) {
      this.contactsFormArray.removeAt(0);
    }

    // Charger les contacts
    if (this.boutique.contact && this.boutique.contact.length > 0) {
      this.boutique.contact.forEach(contact => {
        this.contactsFormArray.push(this.fb.control(contact));
      });
    }

    // Charger la photo de prévisualisation
    if (this.boutique.profil_photo) {
      this.photoPreview = this.boutique.profil_photo;
    }

    this.cdr.detectChanges();
  }

  // Basculer en mode création
  modeCreation(): void {
    console.log('➕ Mode création activé');
    this.isCreating = true;
    this.isEditing = false;
    this.boutiqueForm.reset();
    
    // Vider le FormArray des contacts
    while (this.contactsFormArray.length) {
      this.contactsFormArray.removeAt(0);
    }
    
    this.photoPreview = null;
    this.selectedFile = null;
    this.errorMessage = '';
  }

  // Basculer en mode édition
  modeEdition(): void {
    console.log('✏️ Mode édition activé');
    this.isEditing = true;
    this.isCreating = false;
    this.chargerBoutiqueDansFormulaire();
  }

  // Annuler l'édition/création
  annuler(): void {
    console.log('↩️ Annulation');
    this.isEditing = false;
    this.isCreating = false;
    this.errorMessage = '';
    
    if (this.boutique) {
      this.chargerBoutiqueDansFormulaire();
    }
    
    this.cdr.detectChanges();
  }

  // Sélection de fichier photo
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      console.log('📷 Fichier sélectionné:', file.name);
      this.selectedFile = file;
      
      // Prévisualisation
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // Ajouter un contact
  ajouterContact(): void {
    if (this.newContact && this.newContact.trim()) {
      console.log('📞 Ajout contact:', this.newContact.trim());
      this.contactsFormArray.push(this.fb.control(this.newContact.trim()));
      this.newContact = '';
      this.cdr.detectChanges();
    }
  }

  // Supprimer un contact
  supprimerContact(index: number): void {
    console.log('🗑️ Suppression contact index:', index);
    this.contactsFormArray.removeAt(index);
    this.cdr.detectChanges();
  }

  // Vérifier si une catégorie est sélectionnée
  isCategorieSelected(categorieId: string): boolean {
    const selected = this.boutiqueForm.get('categories')?.value || [];
    return selected.includes(categorieId);
  }

  // Basculer la sélection d'une catégorie
  toggleCategorie(categorieId: string): void {
    const selected = this.boutiqueForm.get('categories')?.value || [];
    const index = selected.indexOf(categorieId);
    
    if (index === -1) {
      selected.push(categorieId);
      console.log('✅ Catégorie ajoutée:', categorieId);
    } else {
      selected.splice(index, 1);
      console.log('❌ Catégorie retirée:', categorieId);
    }
    
    this.boutiqueForm.patchValue({ categories: selected });
  }

  // Sauvegarder (création ou mise à jour)
  sauvegarder(): void {
    console.log('💾 Sauvegarde...');
    
    if (this.boutiqueForm.invalid) {
      console.log('❌ Formulaire invalide');
      Object.keys(this.boutiqueForm.controls).forEach(key => {
        const control = this.boutiqueForm.get(key);
        if (control?.invalid) {
          console.log(`⚠️ Champ invalide: ${key}`, control.errors);
          control.markAsTouched();
        }
      });
      return;
    }

    if (!this.currentUser) {
      console.error('❌ Utilisateur non connecté');
      this.errorMessage = 'Vous devez être connecté';
      return;
    }

    const formValue = this.boutiqueForm.value;
    
    // Préparer les données pour l'API
    const boutiqueData: any = {
      nom: formValue.nom,
      slogan: formValue.slogan || '',
      description: formValue.description || '',
      condition_vente: formValue.condition_vente || '',
      contact: formValue.contacts, // Note: 'contact' pas 'contacts'
      categories: formValue.categories || [],
      responsable: this.currentUser._id
    };

    // Ajouter la photo si présente
    if (formValue.profil_photo) {
      boutiqueData.profil_photo = formValue.profil_photo;
    }

    console.log('📦 Données à sauvegarder:', boutiqueData);

    if (this.isCreating) {
      this.creerBoutique(boutiqueData);
    } else if (this.isEditing && this.boutique) {
      this.mettreAJourBoutique(boutiqueData);
    }
  }

  // Créer une nouvelle boutique
  creerBoutique(boutiqueData: any): void {
    this.loading = true;
    console.log('🆕 Création boutique...');
    
    // Upload photo d'abord si nécessaire
    if (this.selectedFile) {
      console.log('📤 Upload photo...');
      
      this.profilService.uploadPhoto(this.selectedFile).subscribe({
        next: (uploadResponse) => {
          console.log('✅ Upload photo réussi:', uploadResponse);
          boutiqueData.profil_photo = uploadResponse.filePath;
          this.envoyerCreationBoutique(boutiqueData);
        },
        error: (error) => {
          console.error('❌ Erreur upload photo:', error);
          
          if (error.status === 401) {
            console.log('🔒 Token invalide/expiré - Déconnexion forcée');
            this.authService.logout();
            this.router.navigate(['/login']);
            return;
          }
          
          // Continuer sans photo
          console.log('⚠️ Création boutique sans photo');
          this.envoyerCreationBoutique(boutiqueData);
        }
      });
    } else {
      this.envoyerCreationBoutique(boutiqueData);
    }
  }

  private envoyerCreationBoutique(boutiqueData: any): void {
    this.profilService.createBoutique(boutiqueData).subscribe({
      next: (response) => {
        console.log('✅ Boutique créée avec succès:', response);
        this.boutique = response.boutique;
        this.hasBoutique = true;
        this.isCreating = false;
        this.loading = false;
        this.chargerBoutiqueDansFormulaire();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur création boutique:', error);
        
        if (error.status === 401) {
          console.log('🔒 Token invalide/expiré - Déconnexion forcée');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        
        this.loading = false;
        this.errorMessage = error.error?.message || 'Erreur lors de la création';
        this.cdr.detectChanges();
      }
    });
  }

  // Mettre à jour la boutique
  mettreAJourBoutique(boutiqueData: any): void {
    if (!this.boutique || !this.boutique._id) return;
    
    this.loading = true;
    console.log('🔄 Mise à jour boutique...');
    
    // Upload photo d'abord si nouvelle photo
    if (this.selectedFile) {
      console.log('📤 Upload nouvelle photo...');
      
      this.profilService.uploadPhoto(this.selectedFile).subscribe({
        next: (uploadResponse) => {
          console.log('✅ Upload photo réussi:', uploadResponse);
          boutiqueData.profil_photo = uploadResponse.filePath;
          this.envoyerMiseAJourBoutique(boutiqueData);
        },
        error: (error) => {
          console.error('❌ Erreur upload photo:', error);
          
          if (error.status === 401) {
            console.log('🔒 Token invalide/expiré - Déconnexion forcée');
            this.authService.logout();
            this.router.navigate(['/login']);
            return;
          }
          
          // Garder l'ancienne photo
          console.log('⚠️ Mise à jour sans changer la photo');
          this.envoyerMiseAJourBoutique(boutiqueData);
        }
      });
    } else {
      this.envoyerMiseAJourBoutique(boutiqueData);
    }
  }

  private envoyerMiseAJourBoutique(boutiqueData: any): void {
    if (!this.boutique || !this.boutique._id) return;
    
    this.profilService.updateBoutique(this.boutique._id, boutiqueData).subscribe({
      next: (response) => {
        console.log('✅ Boutique mise à jour:', response);
        this.boutique = response.boutique;
        this.isEditing = false;
        this.loading = false;
        this.chargerBoutiqueDansFormulaire();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour boutique:', error);
        
        if (error.status === 401) {
          console.log('🔒 Token invalide/expiré - Déconnexion forcée');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        
        this.loading = false;
        this.errorMessage = error.error?.message || 'Erreur lors de la mise à jour';
        this.cdr.detectChanges();
      }
    });
  }

  // Helper pour afficher le nom de la catégorie
  getCategorieName(categorieId: string): string {
    if (!this.categoriesDisponibles) return '';
    const cat = this.categoriesDisponibles.find(c => c._id === categorieId);
    return cat ? cat.nom : '';
  }
}