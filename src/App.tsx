import React, { useState, useEffect, useRef } from 'react';
import { Circle, ArrowRight, Plus, Minus, Settings, Pause, Play, Info, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Node {
  id: string;
  x: number;
  y: number;
  routingTable: Record<string, { 
    distance: number; 
    nextHop: string; 
    isNew?: boolean;
    isProcessing?: boolean;
    calculated?: boolean;
  }>;
  color: string;
  isActive?: boolean;
}

interface Link {
  from: string;
  to: string;
  weight: number;
  color: string;
  isActive?: boolean;
}

interface AnimatedPath {
  from: string;
  to: string;
  progress: number;
}

const INFINITY = 999999;
const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6'
];

interface NetworkSetupProps {
  onComplete: (nodeCount: number, distances: number[][]) => void;
}

const NetworkSetup: React.FC<NetworkSetupProps> = ({ onComplete }) => {
  const [nodeCount, setNodeCount] = useState(4);
  const [distances, setDistances] = useState<number[][]>([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (nodeCount > 0) {
      const newDistances = Array(nodeCount).fill(0).map(() => 
        Array(nodeCount).fill(INFINITY)
      );
      setDistances(newDistances);
    }
  }, [nodeCount]);

  const handleDistanceChange = (from: number, to: number, value: number) => {
    const newDistances = [...distances];
    newDistances[from][to] = value;
    newDistances[to][from] = value;
    setDistances(newDistances);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect p-8 rounded-xl text-white"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Distance Vector Routing Protocol</h2>
        <p className="text-gray-300 mb-4">
          This protocol enables routers to automatically determine the best path to reach other networks.
          Each router maintains a routing table with distances to all other nodes and shares this information
          with its neighbors.
        </p>
        <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Key Concepts:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Routing tables store distance and next hop information</li>
            <li>Routers exchange information only with neighbors</li>
            <li>Routes are updated when shorter paths are discovered</li>
            <li>Convergence occurs when all tables are stable</li>
          </ul>
        </div>
      </div>
      
      {step === 0 ? (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Network Configuration</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Number of Nodes (2-8)
            </label>
            <input
              type="number"
              min="2"
              max="8"
              value={nodeCount}
              onChange={(e) => setNodeCount(Math.min(8, Math.max(2, parseInt(e.target.value))))}
              className="mt-2 block w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setStep(1)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next: Set Distances
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Set Distances</h3>
          <div className="grid gap-4">
            {Array.from({ length: nodeCount }).map((_, i) => (
              Array.from({ length: i }).map((_, j) => (
                <div key={`${i}-${j}`} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-300">
                    Node {String.fromCharCode(65 + j)} to Node {String.fromCharCode(65 + i)}:
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={distances[i][j] === INFINITY ? '' : distances[i][j]}
                    onChange={(e) => handleDistanceChange(i, j, parseInt(e.target.value) || INFINITY)}
                    className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))
            ))}
          </div>
          <button
            onClick={() => onComplete(nodeCount, distances)}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            Start Simulation
          </button>
        </div>
      )}
    </motion.div>
  );
};

const Network: React.FC = () => {
  const [isSetup, setIsSetup] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [editWeight, setEditWeight] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePaths, setActivePaths] = useState<AnimatedPath[]>([]);
  const [currentPass, setCurrentPass] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentNodeStatus, setCurrentNodeStatus] = useState<string>('');
  const pauseRef = useRef<boolean>(false);

  useEffect(() => {
    pauseRef.current = isPaused;
  }, [isPaused]);

  const delay = async (ms: number) => {
    while (pauseRef.current) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const handleSetupComplete = (nodeCount: number, distances: number[][]) => {
    const radius = 150;
    const centerX = 300;
    const centerY = 200;
    const angleStep = (2 * Math.PI) / nodeCount;

    const newNodes: Node[] = Array.from({ length: nodeCount }).map((_, i) => ({
      id: String.fromCharCode(65 + i),
      x: centerX + radius * Math.cos(i * angleStep),
      y: centerY + radius * Math.sin(i * angleStep),
      routingTable: {},
      color: COLORS[i % COLORS.length]
    }));

    const newLinks: Link[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < i; j++) {
        if (distances[i][j] !== INFINITY) {
          newLinks.push({
            from: String.fromCharCode(65 + j),
            to: String.fromCharCode(65 + i),
            weight: distances[i][j],
            color: COLORS[(i + j) % COLORS.length]
          });
        }
      }
    }

    newNodes.forEach(node => {
      node.routingTable = Object.fromEntries(
        newNodes
          .filter(n => n.id !== node.id)
          .map(n => [n.id, { 
            distance: INFINITY, 
            nextHop: '-', 
            isNew: false,
            isProcessing: false,
            calculated: false
          }])
      );
    });

    setNodes(newNodes);
    setLinks(newLinks);
    setIsSetup(false);
  };

  const restartSimulation = () => {
    if (isProcessing && !isPaused) return;
    
    setIsPaused(false);
    setIsProcessing(false);
    setCurrentPass(0);
    setCurrentNodeStatus('');
    setSelectedNode(null);
    setSelectedLink(null);
    setActivePaths([]);
    
    setNodes(nodes => nodes.map(node => ({
      ...node,
      isActive: false,
      routingTable: Object.fromEntries(
        Object.entries(node.routingTable).map(([k, _]) => [k, {
          distance: INFINITY,
          nextHop: '-',
          isNew: false,
          isProcessing: false,
          calculated: false
        }])
      )
    })));

    setLinks(links => links.map(link => ({
      ...link,
      isActive: false
    })));

    setTimeout(() => {
      updateRoutingTables();
    }, 100);
  };

  const handleSetupClick = () => {
    if (isProcessing && !isPaused) return;
    setIsPaused(false);
    setIsProcessing(false);
    setIsSetup(true);
  };

  const animatePathBetweenNodes = async (fromNode: string, toNode: string) => {
    setActivePaths(prev => [...prev, { from: fromNode, to: toNode, progress: 0 }]);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setActivePaths(prev => prev.filter(p => !(p.from === fromNode && p.to === toNode)));
  };

  const updateRoutingTables = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    let newNodes = [...nodes];
    
    setCurrentNodeStatus('Initializing direct connections between nodes...');
    
    for (const link of links) {
      if (pauseRef.current) {
        setCurrentNodeStatus('Simulation paused');
        await delay(100);
        continue;
      }

      const fromNode = newNodes.find(n => n.id === link.from);
      const toNode = newNodes.find(n => n.id === link.to);
      
      if (fromNode && toNode) {
        setCurrentNodeStatus(`Setting up direct connection: Node ${fromNode.id} ↔ Node ${toNode.id}`);
        
        fromNode.isActive = true;
        toNode.isActive = true;
        link.isActive = true;
        setNodes([...newNodes]);
        setLinks([...links]);
        
        await animatePathBetweenNodes(link.from, link.to);
        await delay(500);

        fromNode.routingTable[toNode.id] = {
          distance: link.weight,
          nextHop: toNode.id,
          isNew: true,
          isProcessing: false,
          calculated: true
        };
        
        toNode.routingTable[fromNode.id] = {
          distance: link.weight,
          nextHop: fromNode.id,
          isNew: true,
          isProcessing: false,
          calculated: true
        };

        fromNode.isActive = false;
        toNode.isActive = false;
        link.isActive = false;
        
        setNodes([...newNodes]);
        await delay(500);
      }
    }

    setNodes([...newNodes]);
    await delay(1000);

    let hasChanges = true;
    let pass = 1;
    const maxPasses = nodes.length - 1;

    while (hasChanges && pass <= maxPasses) {
      setCurrentPass(pass);
      hasChanges = false;
      
      setCurrentNodeStatus(`Starting pass ${pass} of ${maxPasses}`);
      
      for (const node of nodes) {
        for (const dest of nodes) {
          if (pauseRef.current) {
            setCurrentNodeStatus('Simulation paused');
            await delay(100);
            continue;
          }

          if (node.id !== dest.id) {
            setCurrentNodeStatus(`Calculating shortest path: Node ${node.id} → Node ${dest.id}`);
            
            const currentNode = newNodes.find(n => n.id === node.id)!;
            currentNode.isActive = true;
            currentNode.routingTable[dest.id] = {
              ...currentNode.routingTable[dest.id],
              isProcessing: true
            };
            setNodes([...newNodes]);
            await delay(500);
            
            const oldDistance = currentNode.routingTable[dest.id].distance;
            let minDistance = oldDistance;
            let nextHop = currentNode.routingTable[dest.id].nextHop;
            
            for (const link of links) {
              if (link.from === node.id || link.to === node.id) {
                const neighborId = link.from === node.id ? link.to : link.from;
                const neighbor = newNodes.find(n => n.id === neighborId)!;
                const linkWeight = link.weight;
                
                neighbor.isActive = true;
                link.isActive = true;
                setNodes([...newNodes]);
                setLinks([...links]);
                
                await animatePathBetweenNodes(node.id, neighborId);

                const distanceThroughNeighbor = linkWeight + 
                  (neighbor.routingTable[dest.id]?.distance || INFINITY);

                if (distanceThroughNeighbor < minDistance) {
                  minDistance = distanceThroughNeighbor;
                  nextHop = neighborId;
                  hasChanges = true;
                }

                neighbor.isActive = false;
                link.isActive = false;
              }
            }

            currentNode.routingTable[dest.id] = {
              distance: minDistance,
              nextHop: nextHop,
              isNew: minDistance !== oldDistance,
              isProcessing: false,
              calculated: true
            };

            currentNode.isActive = false;
            setNodes([...newNodes]);
            setLinks([...links]);
            await delay(500);
          }
        }
      }
      
      pass++;
      await delay(1000);
    }

    setIsProcessing(false);
    setCurrentPass(0);
    setCurrentNodeStatus('Simulation complete');

    setTimeout(() => {
      setCurrentNodeStatus('');
      setNodes(nodes => nodes.map(node => ({
        ...node,
        routingTable: Object.fromEntries(
          Object.entries(node.routingTable).map(([k, v]) => [k, { ...v, isNew: false }])
        )
      })));
    }, 2000);
  };

  useEffect(() => {
    if (!isSetup && !isProcessing) {
      updateRoutingTables();
    }
  }, [isSetup]);

  const handleLinkClick = (link: Link) => {
    if (!isProcessing) {
      setSelectedLink(link);
      setEditWeight(link.weight);
    }
  };

  const handleWeightChange = (change: number) => {
    if (selectedLink && editWeight !== null && !isProcessing) {
      const newWeight = Math.max(1, editWeight + change);
      setEditWeight(newWeight);
      setLinks(links.map(link => 
        (link.from === selectedLink.from && link.to === selectedLink.to) ||
        (link.from === selectedLink.to && link.to === selectedLink.from)
          ? { ...link, weight: newWeight }
          : link
      ));
      
      setNodes(nodes => nodes.map(node => ({
        ...node,
        routingTable: Object.fromEntries(
          Object.entries(node.routingTable).map(([k, v]) => [k, {
            ...v,
            calculated: false,
            isNew: false,
            isProcessing: false
          }])
        )
      })));
      
      updateRoutingTables();
    }
  };

  const renderAnimatedPaths = () => {
    return activePaths.map((path, index) => {
      const fromNode = nodes.find(n => n.id === path.from);
      const toNode = nodes.find(n => n.id === path.to);
      
      if (!fromNode || !toNode) return null;

      return (
        <motion.circle
          key={`${path.from}-${path.to}-${index}`}
          initial={{ 
            cx: fromNode.x,
            cy: fromNode.y,
            scale: 0
          }}
          animate={{ 
            cx: [fromNode.x, toNode.x],
            cy: [fromNode.y, toNode.y],
            scale: [0, 1, 0]
          }}
          transition={{ 
            duration: 1,
            ease: "linear"
          }}
          r="6"
          fill="#3B82F6" 
          className="highlight-path"
        />
      );
    });
  };

  const renderLinks = () => {
    return links.map((link, index) => {
      const fromNode = nodes.find(n => n.id === link.from);
      const toNode = nodes.find(n => n.id === link.to);
      
      if (!fromNode || !toNode) return null;

      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;

      const isSelected = selectedLink === link;

      return (
        <g key={`${link.from}-${link.to}`}>
          <motion.line
            initial={{ pathLength: 0 }}
            animate={{ 
              pathLength: 1,
              stroke: link.isActive ? '#3B82F6' : isSelected ? '#3b82f6' : link.color,
              strokeWidth: link.isActive ? 4 : isSelected ? 3 : 2
            }}
            transition={{ duration: 0.5 }}
            x1={fromNode.x}
            y1={fromNode.y}
            x2={toNode.x}
            y2={toNode.y}
            className={`cursor-pointer ${isProcessing ? 'pointer-events-none' : ''} ${link.isActive ? 'highlight-path' : ''}`}
            onClick={() => handleLinkClick(link)}
          />
          <g
            transform={`translate(${midX},${midY - 20})`}
            className={`cursor-pointer ${isProcessing ? 'pointer-events-none' : ''}`}
            onClick={() => handleLinkClick(link)}
          >
            {isSelected && !isProcessing ? (
              <motion.g
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <rect
                  x="-40"
                  y="-15"
                  width="80"
                  height="30"
                  fill="rgba(255, 255, 255, 0.1)"
                  stroke={link.color}
                  rx="4"
                />
                <circle
                  cx="-25"
                  cy="0"
                  r="10"
                  fill={link.color}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWeightChange(-1);
                  }}
                />
                <text
                  x="-25"
                  y="0"
                  dy="4"
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                  pointerEvents="none"
                >
                  -
                </text>
                <text
                  x="0"
                  y="0"
                  dy="4"
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                >
                  {link.weight}
                </text>
                <circle
                  cx="25"
                  cy="0"
                  r="10"
                  fill={link.color}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWeightChange(1);
                  }}
                />
                <text
                  x="25"
                  y="0"
                  dy="4"
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                  pointerEvents="none"
                >
                  +
                </text>
              </motion.g>
            ) : (
              <text
                textAnchor="middle"
                fill="white"
                className="text-sm font-medium"
              >
                {link.weight}
              </text>
            )}
          </g>
        </g>
      );
    });
  };

  const renderNodes = () => {
    return nodes.map((node) => (
      <motion.g
        key={node.id}
        initial={{ scale: 0 }}
        animate={{ 
          scale: 1,
          filter: node.isActive ? 'drop-shadow(0 0 8px #3B82F6)' : 'none'
        }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => !isProcessing && setSelectedNode(node.id)}
        className={`cursor-pointer ${isProcessing ? 'pointer-events-none' : ''}`}
      >
        <motion.circle
          cx={node.x}
          cy={node.y}
          r="20"
          animate={{
            fill: node.isActive ? '#3B82F6' : selectedNode === node.id ? '#3b82f6' : node.color
          }}
          className={`transition-colors duration-200 ${node.isActive ? 'highlight-path' : ''}`}
        />
        <text
          x={node.x}
          y={node.y}
          textAnchor="middle"
          dy="6"
          fill="white"
          className="text-sm font-medium"
        >
          {node.id}
        </text>
      </motion.g>
    ));
  };

  const renderRoutingTables = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect p-4 rounded-lg"
          >
            <h4 className="text-md font-medium mb-2 flex items-center gap-2 text-white">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: node.color }}
              />
              Node {node.id}
            </h4>
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-300">
                  <th className="pb-2">To</th>
                  <th className="pb-2">Dist</th>
                  <th className="pb-2">Next</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(node.routingTable).map(([dest, info]) => (
                  <motion.tr
                    key={dest}
                    initial={info.isNew ? { backgroundColor: "rgba(59, 130, 246, 0.2)" } : {}}
                    animate={{ 
                      backgroundColor: info.isProcessing 
                        ? "rgba(59, 130, 246, 0.2)"
                        : info.isNew 
                          ? ["rgba(59, 130, 246, 0.2)", "transparent"] 
                          : "transparent"
                    }}
                    transition={{ duration: 0.5 }}
                    className={`text-sm text-white ${info.isProcessing ? 'processing-row' : ''}`}
                  >
                    <td className="py-1">Node {dest}</td>
                    <td className="py-1">
                      {info.isProcessing ? (
                        <motion.span
                          animate={{ opacity: [0.5, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                        >
                          ...
                        </motion.span>
                      ) : (
                        info.distance === INFINITY ? '∞' : info.distance
                      )}
                    </td>
                    <td className="py-1">
                      {info.isProcessing ? "-" : info.nextHop}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ))}
      </div>
    );
  };

  if (isSetup) {
    return (
      <div className="min-h-screen bg-gradient-dark py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <NetworkSetup onComplete={handleSetupComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-8">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="glass-effect rounded-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">Distance Vector Routing Simulation</h2>
              <div className="flex items-center gap-4">
                {currentPass > 0 && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Pass {currentPass} of {nodes.length - 1}</span>
                  </div>
                )}
                {currentNodeStatus && (
                  <div className={`flex items-center gap-2 text-gray-300 ${
                    currentNodeStatus.includes('Calculating shortest path') ? 'status-highlight' : ''
                  }`}>
                    <Info size={16} className="text-blue-400" />
                    <span className="font-medium">{currentNodeStatus}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isProcessing && (
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 bg-opacity-30 text-yellow-200 rounded-lg hover:bg-opacity-40 transition-colors"
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
              )}
              <button
                onClick={restartSimulation}
                className={`flex items-center gap-2 px-4 py-2 bg-blue-500 bg-opacity-30 text-blue-200 rounded-lg transition-colors ${
                  isProcessing && !isPaused ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-40'
                }`}
                disabled={isProcessing && !isPaused}
              >
                <RotateCcw size={16} />
                <span>Restart</span>
              </button>
              <button
                onClick={handleSetupClick}
                className={`flex items-center gap-2 px-4 py-2 bg-gray-500 bg-opacity-30 text-gray-200 rounded-lg transition-colors ${
                  isProcessing && !isPaused ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-40'
                }`}
                disabled={isProcessing && !isPaused}
              >
                <Settings size={16} />
                <span>Configure</span>
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex justify-center glass-effect rounded-xl p-8">
              <svg width="600" height="400">
                {renderLinks()}
                {renderAnimatedPaths()}
                {renderNodes()}
              </svg>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-white">
                <h3 className="text-xl font-semibold">Routing Tables</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 bg-opacity-30 rounded-full animate-pulse" />
                    <span className="text-sm text-blue-200">Processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 bg-opacity-30 rounded-full" />
                    <span className="text-sm text-green-200">Updated</span>
                  </div>
                </div>
              </div>
              {renderRoutingTables()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Network;