# Baghdad Routing (OSMnx)

This small Python tool downloads a driving graph for Baghdad (or another place) and computes the shortest driving route between two points (lat/lon or human-readable addresses).

Requirements
- Python 3.8+
- See `requirements.txt` (install with `pip install -r requirements.txt`).

Quick start
1. Install dependencies:

```bash
python -m pip install -r requirements.txt
```

2. Run the script with coordinates or addresses:

```bash
python p.py --origin "32.5364,44.4200" --destination "33.3128,44.3615"
# or
python p.py --origin "Tahrir Square, Baghdad" --destination "Baghdad International Airport"
```

Options
- `--place` : place name used to download the graph (default: "Baghdad, Iraq").
- `--cache` : filename to save/load the graph (default: `baghdad.graphml`).
- `--save-route` : save route coordinates and metadata to a JSON file.
- `--plot` : show a simple plot of the route (requires matplotlib).

Notes
- The first run downloads OSM data and may take a few minutes depending on your connection.
- You can swap `--place` to a different city or area, but be mindful of download size.

If you want an online routing API integration instead (OSRM, OpenRouteService, GraphHopper), I can add that as an alternative mode.
