import { PerformanceTracker } from './PerformanceTracker';
import { PositionRating } from './PositionRating';
import { BalanceConfig, BalanceResult, PlayerForBalance, Position } from './types';

/**
 * Algoritmo de balanceamento de times
 * Implementa estrategias greedy e genetica para criar times equilibrados
 */
export class BalanceAlgorithm {
  private positionRating: PositionRating;
  private performanceTracker: PerformanceTracker;
  private config: BalanceConfig;

  constructor(
    positionRating: PositionRating,
    performanceTracker: PerformanceTracker,
    config?: Partial<BalanceConfig>
  ) {
    this.positionRating = positionRating;
    this.performanceTracker = performanceTracker;
    this.config = {
      strategy: 'greedy',
      maxRatingDifference: 100,
      preferPositionSpecialists: true,
      considerRecentForm: true,
      formWeight: 0.1,
      positionPreferenceWeight: 0.2,
      ...config,
    };
  }

  /**
   * Balanceia jogadores em dois times
   * @param players Lista de jogadores para balancear
   * @returns Resultado com times balanceados e metricas
   */
  balanceTeams(players: PlayerForBalance[]): BalanceResult {
    if (players.length < 2) {
      throw new Error('Minimo 2 jogadores necessarios para balanceamento');
    }

    // Valida e ajusta ratings considerando forma
    const adjustedPlayers = this.adjustPlayersForBalance(players);

    // Executa estrategia escolhida
    let team1: PlayerForBalance[];
    let team2: PlayerForBalance[];

    if (this.config.strategy === 'genetic') {
      ({ team1, team2 } = this.geneticBalance(adjustedPlayers));
    } else {
      ({ team1, team2 } = this.greedyBalance(adjustedPlayers));
    }

    // Atribui posicoes aos jogadores
    const team1WithPositions = this.assignPositions(team1);
    const team2WithPositions = this.assignPositions(team2);

    // Calcula ratings dos times
    const team1Rating = this.calculateTeamRating(team1WithPositions);
    const team2Rating = this.calculateTeamRating(team2WithPositions);

    // Calcula metricas de qualidade
    const ratingDifference = Math.abs(team1Rating - team2Rating);
    const fairnessScore = this.calculateFairnessScore(
      team1WithPositions,
      team2WithPositions,
      ratingDifference
    );

    return {
      team1: {
        players: team1WithPositions,
        averageRating: team1Rating,
      },
      team2: {
        players: team2WithPositions,
        averageRating: team2Rating,
      },
      ratingDifference,
      fairnessScore,
      strategy: this.config.strategy,
    };
  }

  /**
   * Ajusta ratings considerando forma recente e preferencias
   */
  private adjustPlayersForBalance(players: PlayerForBalance[]): PlayerForBalance[] {
    return players.map((player) => {
      let effectiveRating = player.rating.overall;

      // Aplica ajuste de forma se habilitado
      if (this.config.considerRecentForm && player.recentPerformance) {
        const formFactor = this.performanceTracker.getFormAdjustmentFactor(
          player.recentPerformance
        );
        effectiveRating = Math.round(effectiveRating * formFactor);
      }

      return {
        ...player,
        rating: {
          ...player.rating,
          overall: effectiveRating,
        },
      };
    });
  }

  /**
   * Estrategia Greedy: divide times minimizando diferenca de rating
   * Ordena jogadores por rating e distribui alternadamente
   */
  private greedyBalance(players: PlayerForBalance[]): {
    team1: PlayerForBalance[];
    team2: PlayerForBalance[];
  } {
    // Ordena jogadores por rating (maior primeiro)
    const sorted = [...players].sort((a, b) => b.rating.overall - a.rating.overall);

    const team1: PlayerForBalance[] = [];
    const team2: PlayerForBalance[] = [];

    // Distribui alternadamente priorizando equilibrio
    for (let i = 0; i < sorted.length; i++) {
      const team1Rating = this.calculateTeamRating(team1);
      const team2Rating = this.calculateTeamRating(team2);

      if (team1Rating <= team2Rating) {
        team1.push(sorted[i]);
      } else {
        team2.push(sorted[i]);
      }
    }

    return { team1, team2 };
  }

  /**
   * Estrategia Genetica: usa algoritmo genetico para otimizacao
   * Melhor para times grandes, mas mais lenta
   */
  private geneticBalance(players: PlayerForBalance[]): {
    team1: PlayerForBalance[];
    team2: PlayerForBalance[];
  } {
    const POPULATION_SIZE = 100;
    const GENERATIONS = 50;
    const MUTATION_RATE = 0.1;

    // Gera populacao inicial
    let population = this.generateInitialPopulation(players, POPULATION_SIZE);

    // Evolui populacao
    for (let gen = 0; gen < GENERATIONS; gen++) {
      // Avalia fitness de cada individuo
      const fitnessScores = population.map((individual) =>
        this.calculateFitness(individual.team1, individual.team2)
      );

      // Seleciona melhores
      const selected = this.selectBest(population, fitnessScores);

      // Crossover e mutacao
      population = this.evolvePopulation(selected, MUTATION_RATE);
    }

    // Retorna melhor individuo
    const fitnessScores = population.map((individual) =>
      this.calculateFitness(individual.team1, individual.team2)
    );
    const bestIndex = fitnessScores.indexOf(Math.min(...fitnessScores));

    return population[bestIndex];
  }

  /**
   * Gera populacao inicial aleatoria
   */
  private generateInitialPopulation(
    players: PlayerForBalance[],
    size: number
  ): Array<{ team1: PlayerForBalance[]; team2: PlayerForBalance[] }> {
    const population: Array<{ team1: PlayerForBalance[]; team2: PlayerForBalance[] }> = [];

    for (let i = 0; i < size; i++) {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const mid = Math.floor(shuffled.length / 2);
      population.push({
        team1: shuffled.slice(0, mid),
        team2: shuffled.slice(mid),
      });
    }

    return population;
  }

  /**
   * Calcula fitness (menor = melhor)
   * Penaliza diferenca de rating e distribuicao ruim de posicoes
   */
  private calculateFitness(team1: PlayerForBalance[], team2: PlayerForBalance[]): number {
    const team1Rating = this.calculateTeamRating(team1);
    const team2Rating = this.calculateTeamRating(team2);
    const ratingDiff = Math.abs(team1Rating - team2Rating);

    // Fitness basico: diferenca de rating
    let fitness = ratingDiff;

    // Penalidade por distribuicao ruim de posicoes
    const team1Positions = this.assignPositions(team1);
    const team2Positions = this.assignPositions(team2);

    const positionPenalty1 = this.calculatePositionPenalty(team1Positions);
    const positionPenalty2 = this.calculatePositionPenalty(team2Positions);

    fitness += (positionPenalty1 + positionPenalty2) * 50;

    return fitness;
  }

  /**
   * Calcula penalidade por ma distribuicao de posicoes
   * Penaliza jogadores muito fora de suas melhores posicoes
   */
  private calculatePositionPenalty(players: PlayerForBalance[]): number {
    let penalty = 0;

    for (const player of players) {
      if (!player.assignedPosition) continue;

      const bestPosition = this.positionRating.getBestPosition(player.rating);
      if (player.assignedPosition !== bestPosition) {
        const offPositionPenalty = this.positionRating.calculateOffPositionPenalty(
          player.rating,
          player.assignedPosition
        );
        penalty += 1 - offPositionPenalty; // Quanto maior penalty, maior penalidade
      }
    }

    return penalty / players.length;
  }

  /**
   * Seleciona melhores individuos (metade da populacao)
   */
  private selectBest(
    population: Array<{ team1: PlayerForBalance[]; team2: PlayerForBalance[] }>,
    fitnessScores: number[]
  ): Array<{ team1: PlayerForBalance[]; team2: PlayerForBalance[] }> {
    const indexed = population.map((individual, index) => ({
      individual,
      fitness: fitnessScores[index],
    }));

    indexed.sort((a, b) => a.fitness - b.fitness);

    return indexed.slice(0, Math.floor(population.length / 2)).map((item) => item.individual);
  }

  /**
   * Evolui populacao com crossover e mutacao
   */
  private evolvePopulation(
    parents: Array<{ team1: PlayerForBalance[]; team2: PlayerForBalance[] }>,
    mutationRate: number
  ): Array<{ team1: PlayerForBalance[]; team2: PlayerForBalance[] }> {
    const newPopulation: Array<{ team1: PlayerForBalance[]; team2: PlayerForBalance[] }> = [
      ...parents,
    ];

    while (newPopulation.length < parents.length * 2) {
      // Seleciona dois pais aleatorios
      const parent1 = parents[Math.floor(Math.random() * parents.length)];
      const parent2 = parents[Math.floor(Math.random() * parents.length)];

      // Crossover simples: troca alguns jogadores
      let child = this.crossover(parent1, parent2);

      // Mutacao: troca posicao de dois jogadores aleatoriamente
      if (Math.random() < mutationRate) {
        child = this.mutate(child);
      }

      newPopulation.push(child);
    }

    return newPopulation;
  }

  /**
   * Crossover: combina dois pais para gerar filho
   */
  private crossover(
    parent1: { team1: PlayerForBalance[]; team2: PlayerForBalance[] },
    parent2: { team1: PlayerForBalance[]; team2: PlayerForBalance[] }
  ): { team1: PlayerForBalance[]; team2: PlayerForBalance[] } {
    const allPlayers = [...parent1.team1, ...parent1.team2];
    const child = { team1: [...parent1.team1], team2: [] as PlayerForBalance[] };

    // Adiciona jogadores do parent2 que nao estao em team1
    for (const player of [...parent2.team1, ...parent2.team2]) {
      if (!child.team1.find((p) => p.id === player.id)) {
        child.team2.push(player);
      }
    }

    return child;
  }

  /**
   * Mutacao: troca dois jogadores de time aleatoriamente
   */
  private mutate(individual: { team1: PlayerForBalance[]; team2: PlayerForBalance[] }): {
    team1: PlayerForBalance[];
    team2: PlayerForBalance[];
  } {
    const team1Index = Math.floor(Math.random() * individual.team1.length);
    const team2Index = Math.floor(Math.random() * individual.team2.length);

    const newTeam1 = [...individual.team1];
    const newTeam2 = [...individual.team2];

    [newTeam1[team1Index], newTeam2[team2Index]] = [newTeam2[team2Index], newTeam1[team1Index]];

    return { team1: newTeam1, team2: newTeam2 };
  }

  /**
   * Atribui posicoes aos jogadores baseado em suas especializacoes
   */
  private assignPositions(players: PlayerForBalance[]): PlayerForBalance[] {
    const positions: Position[] = [Position.GK, Position.DEF, Position.MID, Position.ATA];
    const assigned: PlayerForBalance[] = [];
    const remaining = [...players];

    // Primeiro passo: atribui jogadores as suas melhores posicoes
    for (const position of positions) {
      if (remaining.length === 0) break;

      // Encontra melhor jogador para essa posicao
      let bestIndex = 0;
      let bestRating = 0;

      for (let i = 0; i < remaining.length; i++) {
        const rating = this.positionRating.getRatingForPosition(remaining[i].rating, position);
        if (rating > bestRating) {
          bestRating = rating;
          bestIndex = i;
        }
      }

      const player = remaining.splice(bestIndex, 1)[0];
      assigned.push({ ...player, assignedPosition: position });
    }

    // Jogadores restantes recebem posicoes MID por padrao
    for (const player of remaining) {
      assigned.push({ ...player, assignedPosition: Position.MID });
    }

    return assigned;
  }

  /**
   * Calcula rating medio do time considerando posicoes
   */
  private calculateTeamRating(players: PlayerForBalance[]): number {
    if (players.length === 0) return 0;

    const totalRating = players.reduce((sum, player) => {
      const position = player.assignedPosition || Position.MID;
      const effectiveRating = this.positionRating.getEffectiveRating(
        player.rating,
        position,
        player.recentPerformance
      );
      return sum + effectiveRating;
    }, 0);

    return Math.round(totalRating / players.length);
  }

  /**
   * Calcula score de justica do balanceamento (0-100)
   * Considera diferenca de rating e distribuicao de posicoes
   */
  private calculateFairnessScore(
    team1: PlayerForBalance[],
    team2: PlayerForBalance[],
    ratingDifference: number
  ): number {
    // Score base: quanto menor a diferenca, maior o score
    let score = Math.max(0, 100 - ratingDifference);

    // Bonus por boa distribuicao de posicoes
    const positionPenalty1 = this.calculatePositionPenalty(team1);
    const positionPenalty2 = this.calculatePositionPenalty(team2);
    const avgPenalty = (positionPenalty1 + positionPenalty2) / 2;

    score -= avgPenalty * 20; // Penalidade maxima de 20 pontos

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Rebalanceia times trocando jogadores especificos
   * Util para ajustes manuais
   */
  rebalanceWithSwap(result: BalanceResult, player1Id: number, player2Id: number): BalanceResult {
    const team1 = [...result.team1.players];
    const team2 = [...result.team2.players];

    const player1Index = team1.findIndex((p) => p.id === player1Id);
    const player2Index = team2.findIndex((p) => p.id === player2Id);

    if (player1Index === -1 || player2Index === -1) {
      throw new Error('Jogadores nao encontrados nos times');
    }

    // Troca jogadores
    [team1[player1Index], team2[player2Index]] = [team2[player2Index], team1[player1Index]];

    // Reatribui posicoes
    const team1WithPositions = this.assignPositions(team1);
    const team2WithPositions = this.assignPositions(team2);

    // Recalcula metricas
    const team1Rating = this.calculateTeamRating(team1WithPositions);
    const team2Rating = this.calculateTeamRating(team2WithPositions);
    const ratingDifference = Math.abs(team1Rating - team2Rating);
    const fairnessScore = this.calculateFairnessScore(
      team1WithPositions,
      team2WithPositions,
      ratingDifference
    );

    return {
      team1: { players: team1WithPositions, averageRating: team1Rating },
      team2: { players: team2WithPositions, averageRating: team2Rating },
      ratingDifference,
      fairnessScore,
      strategy: 'manual',
    };
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
