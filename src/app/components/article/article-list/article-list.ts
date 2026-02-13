import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { ArticleService } from '../../../services/article/article.service' // Corriger le chemin
import { AuthService } from '../../../services/auth'; // Corriger le chemin
import { Router } from '@angular/router'; // Ajouter Router
import { Console } from 'console';

@Component({
  selector: 'app-article-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './article-list.html',
  styleUrls: ['./article-list.css'], // ⚠️ styleUrl -> styleUrls (au pluriel)
})
export class ArticleList implements OnInit {
  articles: any[] = [];
  newArticle = { title: '', content: '' };
  isLoading = false;
  errorMessage = '';

  constructor(
    private articleService: ArticleService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🏗️ Constructeur ArticleList');
  }

async ngOnInit() {
  console.log('🏁 Initialisation ArticleList');
  
  // ✅ PROTECTION 1 : Bloquer tout côté serveur
  if (!this.authService.isBrowser()) {
    console.log('🖥️ SSR - AUCUNE action (pas de chargement articles)');
    return; // ← Sortir complètement
  }

  // ✅ PROTECTION 2 : Vérification auth côté client
  console.log('🌐 Client détecté - Vérification auth');
  await this.authService.initializeAuth();

  if (!this.authService.isLoggedIn()) {
    console.log('🔒 Non authentifié - Redirection immédiate vers login');
    this.router.navigate(['/login']);
    return; // ← Sortir sans charger les articles
  }

  console.log('✅ Authentifié - Chargement des articles autorisé');
  this.loadArticles();
}

loadArticles() {
  // ✅ PROTECTION 3 : Triple sécurité
  if (!this.authService.isBrowser()) {
    console.error('🚫 Tentative loadArticles() côté serveur - BLOQUÉ');
    return;
  }

  if (!this.authService.isLoggedIn()) {
    console.error('🚫 Tentative loadArticles() sans auth - BLOQUÉ');
    this.router.navigate(['/login']);
    return;
  }

  this.isLoading = true;

  this.articleService.getArticles().subscribe({
    next: (data: any[]) => {
      console.log('📦 Articles reçus:', data);
      this.articles = Array.isArray(data) ? data : [];
      this.isLoading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('❌ Erreur chargement:', err);
      
      if (err.status === 401) {
        console.log('🔒 Token invalide/expiré - Déconnexion forcée');
        this.authService.removeToken();
        this.router.navigate(['/login']);
        return;
      }
      
      this.articles = [];
      this.isLoading = false;
      this.errorMessage = 'Erreur de chargement des articles';
      this.cdr.detectChanges();
    }
  });
}
  // loadArticles() {
  //   console.log('🔄 Début chargement des articles...');
  //   this.isLoading = true;
  //   this.errorMessage = '';

  //   this.articleService.getArticles().subscribe({
  //     next: (data: any) => {
  //       console.log('✅ Articles reçus :', data);
  //       // ⚠️ Vérifier la structure de la réponse
  //       if (data && data.articles) {
  //         this.articles = data.articles;
  //       } else if (Array.isArray(data)) {
  //         this.articles = data;
  //       } else {
  //         this.articles = [];
  //       }
  //       this.isLoading = false;
  //     },
  //     error: (err) => {
  //       console.error('❌ Erreur lors du chargement des articles');
  //       console.error('Erreur complète:', err);
        
  //       // ⚠️ Gérer les erreurs d'authentification
  //       if (err.status === 401) {
  //         this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
  //         this.router.navigate(['/login']);
  //       } else {
  //         this.errorMessage = 'Impossible de charger les articles. Vérifiez le serveur.';
  //       }
        
  //       this.isLoading = false;
  //       this.articles = [];
  //     }
  //   });
  // }
// article-list.ts - MODIFIER loadArticles()
// article-list.ts - MODIFIER loadArticles()
// loadArticles() {
//   console.log('🔄 loadArticles() appelé');
//   this.isLoading = true;
//   this.errorMessage = '';

//   this.articleService.getArticles().subscribe({
//     next: (data: any) => {
//       console.log('📦 Données reçues:', data);
//       this.articles = Array.isArray(data) ? data : [];
//       console.log(`✅ ${this.articles.length} articles chargés`);
//       this.isLoading = false; // ⚠️ ICI
      
//       console.log('Vue mise à jour forcée');
//     },
//     error: (err) => {
//       console.error('❌ Erreur complète:', err);
//       this.errorMessage = err.error?.message || 'Erreur lors du chargement';
//       this.isLoading = false; // ⚠️ ICI aussi
//       this.articles = [];
//     },
//     complete: () => {
//       console.log('🏁 Observable complété');
//       this.isLoading = false; // ⚠️ ET ICI pour sécurité
//     }
//   });
// }
// loadArticles() {
//   this.isLoading = true;

//   this.articleService.getArticles().subscribe({
//     next: (data: any[]) => {
//       console.log('📦 Articles reçus:', data);
//       this.articles = Array.isArray(data) ? data : [];
//       this.isLoading = false;
//       this.cdr.detectChanges();
//     },
//     error: (err) => {
//       console.error('❌ Erreur chargement:', err);
      
//       // ✅ Si 401, c'est que le token est invalide/expiré
//       if (err.status === 401) {
//         console.log('🔒 Token invalide - Déconnexion');
//         this.authService.removeToken();
//         this.router.navigate(['/login']);
//         return;
//       }
      
//       this.articles = [];
//       this.isLoading = false;
//       this.errorMessage = 'Erreur de chargement des articles';
//       this.cdr.detectChanges();
//     }
//   });
// }
  deleteArticle(articleId: string) {
    if (confirm('Voulez-vous vraiment supprimer cet article ?')) {
      console.log('🗑️ Suppression article:', articleId);
      
      this.articleService.deleteArticle(articleId).subscribe({
        next: () => {
          console.log('✅ Article supprimé');
          this.articles = this.articles.filter(a => a._id !== articleId);
          
        console.log('Vue mise à jour forcée');
        },
        error: (error) => {
          console.error('❌ Erreur suppression:', error);
          alert('Erreur lors de la suppression: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  addArticle() {
    console.log('➕ Tentative ajout article');
    console.log('Données:', this.newArticle);
    
    if (!this.newArticle.title?.trim() || !this.newArticle.content?.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    this.articleService.addArticle(this.newArticle).subscribe({
      next: (response: any) => {
        console.log('✅ Article ajouté:', response);
        this.newArticle = { title: '', content: '' };
        
        // ⚠️ Vérifier la structure de la réponse
        if (response && response.article) {
          this.articles = [response.article, ...this.articles];
        } else if (response) {
          this.articles = [response, ...this.articles];
        }
        
        console.log('Vue mise à jour forcée');
      },
      error: (error) => {
        console.error('❌ Erreur ajout:', error);
        alert('Erreur: ' + (error.error?.message || error.message));
      }
    });
  }
}