import React from 'react';
import PropTypes from 'prop-types';
import Tangle from '../components/Tangle';
import {connect} from 'react-redux';
import * as d3Force from 'd3-force';
import {scaleLinear} from 'd3-scale';
import Tooltip from 'rc-tooltip';
import 'rc-slider/assets/index.css';
import 'rc-tooltip/assets/bootstrap.css';
import './radio-button.css';
import '../components/Tangle.css';
import IOTA from 'iota.lib.js';
import iotap from 'iotap';



const mapStateToProps = (state, ownProps) => ({});
const mapDispatchToProps = (dispatch, ownProps) => ({});

const nodeRadiusMax = 25;
const nodeRadiusMin = 13;
const showLabelsMinimumRadius = 21;
const getNodeRadius = nodeCount => {
  const smallNodeCount = 20;
  const largeNodeCount = 100;

  if (nodeCount < smallNodeCount) {
    return nodeRadiusMax;
  }
  if (nodeCount > largeNodeCount) {
    return nodeRadiusMin;
  }
  const scale = scaleLinear().domain([smallNodeCount, largeNodeCount]);
  scale.range([nodeRadiusMax, nodeRadiusMin]);

  return scale(nodeCount);
};


const leftMargin = 10;
const rightMargin = 10;
const bottomMargin = 190;

const nodeCountMin = 1;
const nodeCountMax = 500;
const nodeCountDefault = 20;
const lambdaMin = 0.1;
const lambdaMax = 50;
const lambdaDefault = 1.5;
const alphaMin = 0;
const alphaMax = 5;
const alphaDefault = 0.5;
const getTips = ({nodes, links}) => {
	  const tips = nodes.filter(node =>
		      !links.some(link => link.target === node));

	  return new Set(tips);
};



class TangleContainer extends React.Component {
  constructor(props) {
    super();

    this.state = {
      nodes: [],
      links: [],
      nodeCount: nodeCountDefault,
      lambda: lambdaDefault,
      alpha: alphaDefault,
      width: 300, // default values
      height: 300,
      nodeRadius: getNodeRadius(nodeCountDefault),
      rootTransactionHash:"",
      requestServer: iotap.create(new IOTA({
	    'host':'https://potato.iotasalad.org' ,
	    'port':14265 
	})) ,
      subTangleTips:[],
      time:0,
      live:1,
      intervalID:0,
      current_transactionHash:"",
    };




    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);

    this.force = d3Force.forceSimulation();
    this.force.alphaDecay(0.1);

	  
    this.force.on('tick', () => {
      this.force.nodes(this.state.nodes);

      // restrict nodes to window area
	/*
      for (let node of this.state.nodes) {
        node.y = Math.max(this.state.nodeRadius, Math.min(this.state.height - this.state.nodeRadius, node.y));
      }
	*/
      this.setState({
        links: this.state.links,
        nodes: this.state.nodes,
      });
    });

	  
  }
  componentWillUnmount() {
    this.force.stop();
    window.removeEventListener('resize', this.updateWindowDimensions);
  }
  componentDidMount() {
    this.GraphSubTangle();
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);
  }
  updateWindowDimensions() {
    this.setState({
      width: window.innerWidth - leftMargin - rightMargin,
      height: window.innerWidth < 768 ? window.innerHeight : window.innerHeight - bottomMargin,
    }, () => {
      this.recalculateFixedPositions();
      this.force
        .force('no_collision', d3Force.forceCollide().radius(this.state.nodeRadius * 2).strength(0.01).iterations(15))
        .force('pin_y_to_center', d3Force.forceY().y(d => this.state.height / 2).strength(0.1))
        .force('pin_x_to_time', d3Force.forceX().x(d => this.xFromTime(d.time)).strength(1))
        .force('link', d3Force.forceLink().links(this.state.links).strength(0.5).distance(this.state.nodeRadius*3)); // strength in [0,1]

      this.force.restart().alpha(1);
    });
  }


	ShowTransactionHash(e){
	
	const node_index = Number(e.target.getAttribute("name"));


	this.setState({current_transactionHash:this.state.nodes[node_index].transactionHash});

}


  GraphSubTangle() {
    	const nodeRadius = getNodeRadius(1);


	  let c_subTangleTips = [];
	  let c_nodes = [];
		  

	  c_nodes.push({name:'0',time:0,transactionHash:this.state.rootTransactionHash,nodeIndex:0,});

	  c_subTangleTips.push({name:'0',time:0,transactionHash:this.state.rootTransactionHash,nodeIndex:0,});



	let ID = setInterval(()=>{this.DrawNextApprovees();},3000); 

	this.setState({
			nodes: c_nodes,
			links: [],
			subTangleTips: c_subTangleTips,
			time: 0,
      			nodeRadius,
			intervalID: ID,
			live: 1,
    			}, );



      }


	DrawNextApprovees(){

		const nodeRadius = getNodeRadius(6);


		let tangle = "";
		let c_subTangleTips = [];
	  	let c_nodes = this.state.nodes;
	  	let c_links = this.state.links;
	  	let c_time = this.state.time + 1;
		let s_node = this.state.requestServer;

		if(this.state.live == 0){
				return ;
			}
		

		if(this.state.subTangleTips.length > 0){

		for(let findTransaction of this.state.subTangleTips){


		 const approve_list = s_node.findTransactions({'approvees': [findTransaction.transactionHash]});

	Promise.all([approve_list]).then(([approve_list])=>{
		
	  	if(approve_list.length > 0){	


		for(let a_transaction of approve_list){
		
			let exist = 0;
			
			for(let site of c_nodes){
				if(a_transaction == site.transactionHash){
					exist = 1;
				
				}
			}

			if(exist == 0){
			let c_nodeIndex = c_nodes.length;
			let node_time = c_time + Math.random();
			c_nodes.push({name:c_nodeIndex.toString(),time:node_time,transactionHash:a_transaction,nodeIndex:c_nodeIndex,});
			c_subTangleTips.push({name:c_nodeIndex.toString(),time:node_time,transactionHash:a_transaction,nodeIndex:c_nodeIndex,});
			c_links.push({source:c_nodes[c_nodeIndex],target:c_nodes[findTransaction.nodeIndex]});
			}
			
	
			}

		}

	
	});

		}
			}



		tangle = {nodes:c_nodes,links:c_links};


		const {width, height} = this.state;

		/*
    		for (let node of tangle.nodes) {
      			node.y = height/4 + Math.random()*(height/2),
      			node.x = width/2; // required to avoid annoying errors
    			}

		*/
    			this.force.stop();

    			this.setState({
      			nodes: tangle.nodes,
      			links: tangle.links,
			subTangleTips: c_subTangleTips,
			time: c_time,
      			nodeRadius,
    			}, () => {
      			// Set all nodes' x by time value after state has been set
      			//this.recalculateFixedPositions();
    			});

    			this.force.restart().alpha(1);

	
	}


  recalculateFixedPositions() {
    // Set genesis's y to center
    const genesisNode = this.state.nodes[0];
    genesisNode.fx = this.setState.height / 2;

    for (let node of this.state.nodes) {
      node.fx = this.xFromTime(node.time);
    }
  }
  xFromTime(time) {
    const padding = this.state.nodeRadius;
    // Avoid edge cases with 0 or 1 nodes
    if (this.state.nodes.length < 2) {
      return padding;
    }

    const maxTime = this.state.nodes[this.state.nodes.length-1].time;

    // Rescale nodes' x to cover [margin, width-margin]
    const scale = scaleLinear().domain([0, maxTime]);
    scale.range([padding, this.state.width - padding]);

    return scale(time);
  }


   getApprovedNodes(root) {
    if (!root) {
      return {nodes: new Set(), links: new Set()};
    }

    return getDescendants({
      nodes: this.state.nodes,
      links: this.state.links,
      root,
    });
  }
  getApprovingNodes(root) {
    if (!root) {
      return {nodes: new Set(), links: new Set()};
    }

    return getAncestors({
      nodes: this.state.nodes,
      links: this.state.links,
      root,
    });
  }





    render() {
    const {nodeCount,lambda,alpha, width, height} = this.state;
    const approved = this.getApprovedNodes(this.state.hoveredNode);
    const approving = this.getApprovingNodes(this.state.hoveredNode);

    return (
      <div> 
	    <form >
	            <label>

	              SubTangle:
	              <input type="text"   onChange={e => this.setState({rootTransactionHash: e.target.value})} />
	            </label>
	            <input type="submit" value="Graph" onClick={(e)=>{
		e.preventDefault();
		 this.GraphSubTangle();
		    }} />
	          </form>
			    <br></br>
	     <button onClick={(e) =>{ 
		     		     e.preventDefault();
		     		     this.setState({nodes:[],links:[],time:0,current_transactionHash:""});
	     			     
		     		     clearInterval(this.state.intervalID);
	     }}>clear</button>
	    <br></br>
	    <button onClick={(e)=>{this.setState({live:0});}}>stop</button>
	    <button onClick={(e)=>{this.setState({live:1});}}>carry on</button>
	    <br></br>
        <Tangle links={this.state.links} nodes={this.state.nodes}
          nodeCount={6}
          width={width}
          height={height}
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          nodeRadius={this.state.nodeRadius}
	  mouseEntersNodeHandler={this.ShowTransactionHash.bind(this)}
          approvedNodes={approved.nodes}
          approvedLinks={approved.links}
          approvingNodes={approving.nodes}
          approvingLinks={approving.links}
          hoveredNode={this.state.hoveredNode}
          tips={getTips({
            nodes: this.state.nodes,
            links: this.state.links,
          })}
          showLabels={this.state.nodeRadius > showLabelsMinimumRadius ? true : false}
        />
	    <div>
	    <p>Transaction Hash :</p>
	    <p>{this.state.current_transactionHash}</p>
	    </div>
      </div>
    );
  }
}

const TangleContainerConnected = connect(
  mapStateToProps,
  mapDispatchToProps
)(TangleContainer);

export default TangleContainerConnected;
