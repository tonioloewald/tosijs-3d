import{fC as v}from"./site-nc1s1hyp.js";import{oF as x}from"./site-ejnw45t3.js";class l extends v{constructor(f,k){super(f,k)}}class q extends l{constructor(f,k){super(f,k);this._subGraph=new q._SubGraph(this)}async _initAsync(f){if(await this._subGraph.initAsync(f),this.engine.mainOut){if(!this._connect(this.engine.mainOut))throw Error("Connect failed")}this.engine._addMainBus(this)}dispose(){super.dispose(),this.engine._removeMainBus(this)}get _inNode(){return this._subGraph._inNode}get _outNode(){return this._subGraph._outNode}_connect(f){if(!super._connect(f))return!1;if(f._inNode)this._outNode?.connect(f._inNode);return!0}_disconnect(f){if(!super._disconnect(f))return!1;if(f._inNode)this._outNode?.disconnect(f._inNode);return!0}getClassName(){return"_WebAudioMainBus"}}q._SubGraph=class extends x{get _downstreamNodes(){return this._owner._downstreamNodes??null}};
export{l as dC,q as eC};

//# debugId=4F37449C868D0E6064756E2164756E21
//# sourceMappingURL=site-vwrvnbk1.js.map
