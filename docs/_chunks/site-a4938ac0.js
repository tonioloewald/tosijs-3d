import{TG as i}from"./site-75qf1xvh.js";import{gH as r}from"./site-bcv7fx98.js";class n extends i{constructor(e,t){super(e,t)}}class s extends n{constructor(e,t){super(e,t);this._subGraph=new s._SubGraph(this)}async _initAsync(e){if(await this._subGraph.initAsync(e),this.engine.mainOut){if(!this._connect(this.engine.mainOut))throw Error("Connect failed")}this.engine._addMainBus(this)}dispose(){super.dispose(),this.engine._removeMainBus(this)}get _inNode(){return this._subGraph._inNode}get _outNode(){return this._subGraph._outNode}_connect(e){if(!super._connect(e))return!1;if(e._inNode)this._outNode?.connect(e._inNode);return!0}_disconnect(e){if(!super._disconnect(e))return!1;if(e._inNode)this._outNode?.disconnect(e._inNode);return!0}getClassName(){return"_WebAudioMainBus"}}s._SubGraph=class extends r{get _downstreamNodes(){return this._owner._downstreamNodes??null}};
export{n as RG,s as SG};

//# debugId=EDF5FF7103DC9E2064756E2164756E21
//# sourceMappingURL=site-a4938ac0.js.map
