import{fC as i}from"./site-k7qhvmg2.js";import{oF as r}from"./site-3a1zcgje.js";class n extends i{constructor(e,t){super(e,t)}}class s extends n{constructor(e,t){super(e,t);this._subGraph=new s._SubGraph(this)}async _initAsync(e){if(await this._subGraph.initAsync(e),this.engine.mainOut){if(!this._connect(this.engine.mainOut))throw Error("Connect failed")}this.engine._addMainBus(this)}dispose(){super.dispose(),this.engine._removeMainBus(this)}get _inNode(){return this._subGraph._inNode}get _outNode(){return this._subGraph._outNode}_connect(e){if(!super._connect(e))return!1;if(e._inNode)this._outNode?.connect(e._inNode);return!0}_disconnect(e){if(!super._disconnect(e))return!1;if(e._inNode)this._outNode?.disconnect(e._inNode);return!0}getClassName(){return"_WebAudioMainBus"}}s._SubGraph=class extends r{get _downstreamNodes(){return this._owner._downstreamNodes??null}};
export{n as dC,s as eC};

//# debugId=614F6D458ADC9FD864756E2164756E21
//# sourceMappingURL=site-gdnqsgtz.js.map
