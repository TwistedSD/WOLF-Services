<div align="center">
  <img src="src/assets/logo/primary.png" alt="WOLF Tribe Logo" width="300"/>

  # WOLF Tribal Website

  **Elite tribal hub for WOLF and AWAR members in EVE Frontier**
</div>

---

## About

This is the official tribal hub for the **WOLF** tribe in EVE Frontier. Access is restricted to verified WOLF and AWAR tribe members only. Connect your wallet to verify your tribal membership and access exclusive tools and information.

## Features

### Smart Assemblies
View and manage all your network nodes and connected infrastructure:
- **Network Nodes** - Monitor fuel levels and online status
- **Storage Units** - Track capacity and inventory across all facilities
- **Manufacturing Facilities** - View refineries, printers, assemblers, and shipyards
- **Turrets** - Monitor defensive installations

### Blueprint Calculator
Advanced production planning with excess material reuse:
- **Assembly Types** - Filter by Printer, Refinery, Assembler, Shipyard, Factory
- **Production Tree** - Recursive material breakdown with visual indicators
- **Excess Material Reuse** - See materials saved through byproduct reuse (green badges)
- **Byproduct Tracking** - View all byproducts generated (blue badges)
- **Blueprint Alternatives** - Select optimal production paths
- **Base Material Summary** - Aggregated ore requirements with savings indicator
- **Production Time** - Full time breakdown for manufacturing chains
- **Quantity Planning** - Calculate requirements for any quantity

### Killboard
Track combat activity across EVE Frontier:
- **Recent Kills** - View latest killmails with filtering by player or solar system
- **Top Killers** - Leaderboard of pilots with most kills
- **Most Losses** - Track highest loss counts
- Real-time updates every 5 minutes
- Solar system name resolution and search

## Access Control

Access to this tribal hub is restricted to verified members of:
- **WOLF Tribe** (Primary)
- **AWAR Tribe** (Allied access)

Tribal membership is verified on-chain when you connect your wallet. Non-members will be denied access.

## API Integration

The website connects to the WOLF API at `https://api.ef-wolf.co.uk` for:
- Blueprint data and production calculations
- Smart assembly information
- Killboard data

## New Calculator Features

The enhanced blueprint calculator includes:

**Visual Indicators:**
- Green badges - Materials reused from excess pool
- Blue badges - Byproducts generated during production
- BASE badges - Base materials (ores that cannot be manufactured)
- Excess display - Shows overproduction amounts

**Advanced Features:**
- Recursive production tree with expand/collapse
- Blueprint selector dropdowns for alternative production methods
- Real-time recalculation when changing quantity or blueprints
- Summary panel with base materials, excess, byproducts, and time

**Production Optimization:**
- Automatic calculation of optimal blueprint paths
- Excess material reuse across the production chain
- Byproduct tracking and reuse visibility
- Savings indicator showing materials saved through reuse

## Development

See [CALCULATOR-IMPLEMENTATION.md](CALCULATOR-IMPLEMENTATION.md) for details on the enhanced blueprint calculator implementation.

## Technology Stack

- **React** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **MUD** for blockchain integration
- **EVE Frontier** smart contracts
