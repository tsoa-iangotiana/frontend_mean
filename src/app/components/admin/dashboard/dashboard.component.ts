import { Component, OnInit, OnDestroy, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
// REMPLACER par un import de type uniquement + chargement dynamique
import type * as EChartsType from 'echarts';

// Services
import { DashboardService } from '../../../services/admin/dashboard/dashboard.service';

// Types
import {
  OverviewData,
  BoxesData,
  BoutiquesData,
  FinancesData,
  CommandesData,
  TicketsData,
  AvisData,
  TriBoutiques,
  FiltreActif
} from '../../../services/admin/dashboard/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [DashboardService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {
  // Données
  private echarts: typeof EChartsType | null = null;
  overviewData: OverviewData | null = null;
  boxesData: BoxesData | null = null;
  boutiquesData: BoutiquesData | null = null;
  financesData: FinancesData | null = null;
  commandesData: CommandesData | null = null;
  ticketsData: TicketsData | null = null;
  avisData: AvisData | null = null;

  // États
  loading = true;
  lastUpdate = new Date();
  showDebug = false;
  debugLogs: string[] = [];

  // Filtres
  boutiquesTri: TriBoutiques = 'note';
  boutiquesFiltre: FiltreActif = 'all';
  ticketsFiltres: any = {
    statut: 'TOUS',
    priorite: 'TOUS',
    limite: 20
  };

  // Instances des graphiques echarts
  private chartInstances: Map<string, echarts.ECharts> = new Map();

  // Flags pour savoir quels graphiques doivent être (re)dessinés
  private pendingCharts: Set<string> = new Set();

  constructor(private dashboardService: DashboardService, private cdr: ChangeDetectorRef) {
    this.log('DashboardComponent initialisé');
  }

  async ngOnInit(): Promise<void> {
  this.log('ngOnInit appelé');
  // Charger echarts de façon dynamique
  this.echarts = await import('echarts');
  this.loadAllData();
}

  ngAfterViewChecked(): void {
    // Initialiser les graphiques en attente une fois que le DOM est prêt
    if (this.pendingCharts.size > 0) {
      const pending = [...this.pendingCharts];
      this.pendingCharts.clear();
      pending.forEach(id => this.renderChart(id));
    }
  }

  ngOnDestroy(): void {
  this.chartInstances.forEach(chart => chart.dispose());
  this.chartInstances.clear();
}

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.debugLogs.push(logMessage);
  }

  // ─── Initialisation / rendu d'un graphique ───────────────────────────────

  private scheduleChart(id: string): void {
    this.pendingCharts.add(id);
  }

 private renderChart(id: string): void {
  if (!this.echarts) {
    this.pendingCharts.add(id);
    return;
  }
  const el = document.getElementById(id);
  if (!el) {
    this.pendingCharts.add(id);
    return;
  }

  let chart = this.chartInstances.get(id);
  if (!chart) {
    chart = this.echarts.init(el);
    this.chartInstances.set(id, chart);
  }

  const option = this.getChartOption(id);
  if (option) {
    chart.setOption(option, true);
  }
}

  private getChartOption(id: string): echarts.EChartsOption | null {
    switch (id) {
      case 'chart-boxes':          return this.buildBoxesChartOption();
      case 'chart-boutiques-status': return this.buildBoutiquesStatusChartOption();
      case 'chart-boutiques-top':  return this.buildBoutiquesTopChartOption();
      case 'chart-finances':       return this.buildFinancesChartOption();
      case 'chart-commandes-evo':  return this.buildCommandesEvolutionChartOption();
      case 'chart-commandes-statuts': return this.buildCommandesStatutsChartOption();
      case 'chart-tickets-statuts': return this.buildTicketsStatutsChartOption();
      case 'chart-tickets-priorites': return this.buildTicketsPrioritesChartOption();
      case 'chart-avis':           return this.buildAvisChartOption();
      default: return null;
    }
  }

  // ─── Chargement des données ───────────────────────────────────────────────

  loadAllData(): void {
    this.loading = true;
    this.log('Début du chargement de toutes les données...');
    this.loadOverview();
    this.loadBoxesStats();
    this.loadBoutiquesStats();
    this.loadFinancesStats();
    this.loadCommandesStats();
    this.loadTicketsStats();
    this.loadAvisStats();
  }

  loadOverview(): void {
    this.log('Chargement des données overview...');
    this.dashboardService.getOverview().subscribe({
      next: (data) => {
        this.log(`✅ Overview chargé`);
        this.overviewData = data;
        this.lastUpdate = new Date();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.log(`❌ Erreur chargement overview: ${error.message}`);
      }
    });
  }

  loadBoxesStats(): void {
    this.log('Chargement des statistiques boxes...');
    this.dashboardService.getBoxesStats().subscribe({
      next: (data) => {
        this.log(`✅ Boxes stats chargées: ${data.total} boxes`);
        this.boxesData = data;
        this.scheduleChart('chart-boxes');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.log(`❌ Erreur chargement boxes: ${error.message}`);
      }
    });
  }

  loadBoutiquesStats(): void {
    this.log(`Chargement boutiques - tri: ${this.boutiquesTri}, filtre: ${this.boutiquesFiltre}`);
    this.dashboardService.getBoutiquesStats(this.boutiquesTri, this.boutiquesFiltre).subscribe({
      next: (data) => {
        this.log(`✅ Boutiques stats chargées: ${data.total} boutiques`);
        this.boutiquesData = data;
        this.scheduleChart('chart-boutiques-status');
        this.scheduleChart('chart-boutiques-top');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.log(`❌ Erreur chargement boutiques: ${error.message}`);
      }
    });
  }

  loadFinancesStats(mois: number = 6): void {
    this.log(`Chargement finances sur ${mois} mois...`);
    this.dashboardService.getFinancesStats(mois).subscribe({
      next: (data) => {
        this.log(`✅ Finances stats chargées`);
        this.financesData = data;
        this.scheduleChart('chart-finances');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.log(`❌ Erreur chargement finances: ${error.message}`);
      }
    });
  }

  loadCommandesStats(mois: number = 6): void {
    this.log(`Chargement commandes sur ${mois} mois...`);
    this.dashboardService.getCommandesStats(mois).subscribe({
      next: (data) => {
        this.log(`✅ Commandes stats chargées`);
        this.commandesData = data;
        this.scheduleChart('chart-commandes-evo');
        this.scheduleChart('chart-commandes-statuts');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.log(`❌ Erreur chargement commandes: ${error.message}`);
      }
    });
  }

  loadTicketsStats(): void {
    this.log(`Chargement tickets - filtres: ${JSON.stringify(this.ticketsFiltres)}`);
    this.dashboardService.getTicketsStats(this.ticketsFiltres).subscribe({
      next: (data) => {
        this.log(`✅ Tickets stats chargées: ${data.tickets_urgents.length} urgents`);
        this.ticketsData = data;
        this.scheduleChart('chart-tickets-statuts');
        this.scheduleChart('chart-tickets-priorites');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.log(`❌ Erreur chargement tickets: ${error.message}`);
      }
    });
  }

  loadAvisStats(limite: number = 10): void {
    this.log(`Chargement avis - limite: ${limite}`);
    this.dashboardService.getAvisStats(limite).subscribe({
      next: (data) => {
        this.log(`✅ Avis stats chargées: note moyenne ${data.note_moyenne_centre}`);
        this.avisData = data;
        this.scheduleChart('chart-avis');
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.log(`❌ Erreur chargement avis: ${error.message}`);
        this.loading = false;
      }
    });
  }

  refreshDashboard(): void {
    this.log('🔄 Rafraîchissement du dashboard...');
    // Détruire les instances pour les recréer proprement
    this.chartInstances.forEach(chart => chart.dispose());
    this.chartInstances.clear();
    this.loadAllData();
    this.cdr.markForCheck();
  }

  toggleDebug(): void {
    this.showDebug = !this.showDebug;
  }

  // ─── Constructeurs d'options de graphiques ────────────────────────────────

  private buildBoxesChartOption(): echarts.EChartsOption | null {
    if (!this.boxesData) return null;
    return {
      title: { text: 'Occupation des boxes', left: 'center' },
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' },
      series: [{
        name: 'Occupation',
        type: 'pie',
        radius: '50%',
        data: [
          { value: this.boxesData.libres, name: 'Libres', itemStyle: { color: '#28a745' } },
          { value: this.boxesData.occupees, name: 'Occupées', itemStyle: { color: '#dc3545' } }
        ],
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' }
        }
      }]
    };
  }

  private buildBoutiquesStatusChartOption(): echarts.EChartsOption | null {
    if (!this.boutiquesData) return null;
    return {
      title: { text: 'Statut des boutiques', left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        name: 'Statut',
        type: 'pie',
        radius: '50%',
        data: [
          { value: this.boutiquesData.actives, name: 'Actives', itemStyle: { color: '#28a745' } },
          { value: this.boutiquesData.inactives, name: 'Inactives', itemStyle: { color: '#6c757d' } }
        ]
      }]
    };
  }

  private buildBoutiquesTopChartOption(): echarts.EChartsOption | null {
    if (!this.boutiquesData) return null;
    const top = [...this.boutiquesData.liste]
      .sort((a, b) => b.note_moyenne - a.note_moyenne)
      .slice(0, 5);
    return {
      title: { text: 'Top 5 boutiques par note', left: 'center' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', max: 5 },
      yAxis: { type: 'category', data: top.map(b => b.nom) },
      series: [{
        name: 'Note moyenne',
        type: 'bar',
        data: top.map(b => b.note_moyenne),
        itemStyle: { color: '#ffc107' }
      }]
    };
  }

  private buildFinancesChartOption(): echarts.EChartsOption | null {
    if (!this.financesData) return null;
    return {
      title: { text: 'Évolution des loyers', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: this.financesData.evolution_mensuelle.map(m => m.label)
      },
      yAxis: { type: 'value', axisLabel: { formatter: '{value} €' } },
      series: [{
        name: 'Loyers',
        type: 'line',
        data: this.financesData.evolution_mensuelle.map(m => m.total),
        smooth: true,
        lineStyle: { color: '#007bff', width: 3 },
        areaStyle: { color: 'rgba(0,123,255,0.1)' }
      }]
    };
  }

  private buildCommandesEvolutionChartOption(): echarts.EChartsOption | null {
    if (!this.commandesData) return null;
    return {
      title: { text: 'Évolution des commandes', left: 'center' },
      tooltip: { trigger: 'axis' },
      legend: { data: ['Click & Collect', 'Livraison', 'Total'], bottom: 0 },
      xAxis: {
        type: 'category',
        data: this.commandesData.evolution_mensuelle.map(m => m.label)
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Click & Collect',
          type: 'bar',
          stack: 'total',
          data: this.commandesData.evolution_mensuelle.map(m => m.click_collect),
          itemStyle: { color: '#17a2b8' }
        },
        {
          name: 'Livraison',
          type: 'bar',
          stack: 'total',
          data: this.commandesData.evolution_mensuelle.map(m => m.livraison),
          itemStyle: { color: '#ffc107' }
        },
        {
          name: 'Total',
          type: 'line',
          data: this.commandesData.evolution_mensuelle.map(m => m.total),
          lineStyle: { color: '#28a745', width: 2 }
        }
      ]
    };
  }

  private buildCommandesStatutsChartOption(): echarts.EChartsOption | null {
    if (!this.commandesData) return null;
    return {
      title: { text: 'Répartition par statut', left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        name: 'Statuts',
        type: 'pie',
        radius: '50%',
        data: this.commandesData.repartition_statuts.map(s => ({
          name: s.statut,
          value: s.total
        }))
      }]
    };
  }

  private buildTicketsStatutsChartOption(): echarts.EChartsOption | null {
    if (!this.ticketsData) return null;
    return {
      title: { text: 'Tickets par statut', left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        name: 'Statuts',
        type: 'pie',
        radius: '50%',
        data: this.ticketsData.compteurs.par_statut.map(s => ({
          name: s.statut,
          value: s.total
        }))
      }]
    };
  }

  private buildTicketsPrioritesChartOption(): echarts.EChartsOption | null {
    if (!this.ticketsData) return null;
    return {
      title: { text: 'Tickets par priorité', left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        name: 'Priorités',
        type: 'pie',
        radius: '50%',
        data: this.ticketsData.compteurs.par_priorite.map(p => ({
          name: p.priorite,
          value: p.total,
          itemStyle: {
            color: p.priorite === 'URGENT' ? '#dc3545' :
                   p.priorite === 'HAUTE'  ? '#fd7e14' :
                   p.priorite === 'MOYENNE'? '#ffc107' : '#28a745'
          }
        }))
      }]
    };
  }

  private buildAvisChartOption(): echarts.EChartsOption | null {
    if (!this.avisData) return null;
    return {
      title: { text: 'Distribution des notes', left: 'center' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: this.avisData.distribution_notes.map(n => n.label)
      },
      yAxis: { type: 'value' },
      series: [{
        name: "Nombre d'avis",
        type: 'bar',
        data: this.avisData.distribution_notes.map(n => n.total),
        itemStyle: { color: '#17a2b8' }
      }]
    };
  }
}