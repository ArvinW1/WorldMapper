import React, { useState } from 'react';
import { withRouter } from 'react-router-dom';
import {WLayout, WLHeader, WNavbar, WNavItem} from 'wt-frontend';
import NavbarOptions from '../navbar/NavbarOptions';
import UpdateAccount from '../modals/UpdateAccount';
import Delete from '../modals/Delete';
import Logo from '../navbar/Logo';
import { useMutation, useQuery } from '@apollo/client';
import { GET_DB_MAP } from '../../cache/queries';
import WLMain from 'wt-frontend/build/components/wmodal/WMMain';
import MainContents from '../main/MainContents';
import * as mutations from '../../cache/mutations';
import { EditMap_Transaction, SortMaps_Transaction, UpdateMap_Transaction } from '../../utils/jsTPS';
import Ancestors from '../navbar/Ancestors';

function Spreadsheet(props) {

	const [showDelete, toggleShowDelete] = useState(false);
	const [showLogin, toggleShowLogin] = useState(false);
	const [showCreate, toggleShowCreate] = useState(false);
	const [showUpdate, toggleShowUpdate] = useState(false);
	const [activeList, setActiveList] = useState({});
	const [currentRegions, SetCurrentRegions] = useState({});
	const [region, setRegion] = useState({});
	const [index, setIndex] = useState({});
	const [currentIndex, setCurrentIndex] = useState({});
	const [showNameInput, toggleNameInput] = useState(false);
	const [showCapitalInput, toggleCapitalInput] = useState(false);
	const [showLeaderInput, toggleLeaderInput] = useState(false);
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	let maps = [];

	const { loading, error, data, refetch } = useQuery(GET_DB_MAP)

	if (loading) { console.log(loading, 'loading'); }
	if (error) { console.log(error, 'error'); }
	if (data) {
		// Assign todolists 
		for (let map of data.getAllMaps) {
			maps.push(map)
		}
		if (!activeList._id) {
			const currentList = maps.find(map => map._id === props.match.params._id)
			setActiveList(currentList)
			if (currentList.subregions) {
				let currentsub = []
				for (let sub of currentList.subregions) {
					let children = maps.find(map => map._id === sub)
					currentsub.push(children)
				}
				SetCurrentRegions(currentsub)
			}
		}
	}
	//See if it is subregion by checking if currentlist is null/undefined

	const keyCombination = (e, callback) => {
		if (e.key === 'z' && e.ctrlKey) {
			if (props.tps.hasTransactionToUndo()) {
				tpsUndo();
			}
		}
		else if (e.key === 'y' && e.ctrlKey) {
			if (props.tps.hasTransactionToRedo()) {
				tpsRedo();
			}
		}else if (e.keyCode === 37){ // Left Arrow - 37
			if(showCapitalInput){
				toggleNameInput(true)
				toggleCapitalInput(false)
				toggleLeaderInput(false)
			}else if(showLeaderInput){
				toggleNameInput(false)
				toggleCapitalInput(true)
				toggleLeaderInput(false)
			}
		}else if(e.keyCode === 39){ // Right Arrow - 39
			if(showCapitalInput){
				toggleNameInput(false);
				toggleCapitalInput(false);
				toggleLeaderInput(true);
			}else if(showNameInput){
				toggleNameInput(false);
				toggleCapitalInput(true);
				toggleLeaderInput(false);
			}
		}
		else if(e.keyCode === 38){//Up Arrow - 38
			if(currentIndex !== 0){
				setCurrentIndex(currentIndex -1);
			}
		}else if(e.keyCode === 40){//Down arrow - 40
			if(currentIndex !== currentRegions.length -1){
				setCurrentIndex(currentIndex + 1);
			}
		}
	}
	document.onkeydown = keyCombination;

	const auth = props.user === null ? false : true;

	const reloadList = async () => {
		if (activeList._id) {
			let tempID = props.match.params._id;
			let map = maps.find(map => map._id === tempID);
			setActiveList(map);
			console.log(map)
			if (map.subregions) {
				let currentsub = []
				for (let sub of map.subregions) {
					let children = maps.find(map => map._id === sub)
					currentsub.push(children)
				}
				SetCurrentRegions(currentsub)
			}
		}
	}
	const mutationOptions = {
		refetchQueries: [{ query: GET_DB_MAP }],
		awaitRefetchQueries: true,
		onCompleted: () => reloadList()
	}

	const [AddSubregion] = useMutation(mutations.ADD_SUBREGION, mutationOptions)
	const [UpdateMapFieldInfo] = useMutation(mutations.UPDATE_MAP_FIELD, mutationOptions);
	const [DeleteSubregion] = useMutation(mutations.DELETE_SUBREGION, mutationOptions)
	const [SortSubregions] = useMutation(mutations.SORT_MAPS, mutationOptions)

	const tpsUndo = async () => {
		const ret = await props.tps.undoTransaction();
		if (ret) {
			setCanUndo(props.tps.hasTransactionToUndo());
			setCanRedo(props.tps.hasTransactionToRedo());
		}
	}

	const tpsRedo = async () => {
		const ret = await props.tps.doTransaction();
		if (ret) {
			setCanUndo(props.tps.hasTransactionToUndo());
			setCanRedo(props.tps.hasTransactionToRedo());
		}
	}

	const clearTps = async () => {
		const ret = props.tps.clearAllTransactions();
		if(ret){
			setCanUndo(false);
			setCanRedo(false);
		}
	}


	const addSubregion = async () => {
		let map = activeList;
		let newSub = {
			_id: '',
			name: 'Not Named',
			parent: activeList._id,
			capital: 'No Capital',
			leader: 'No Leader',
			owner: props.user._id,
			landmarks: [],
			subregions: [],
			sortRule: 'name',
	 		sortDirection: -1
		}
		let opcode = 1;
		let transaction = new UpdateMap_Transaction(map._id, newSub._id, newSub, opcode, AddSubregion, DeleteSubregion)
		props.tps.addTransaction(transaction)
		tpsRedo();
	}

	const editMap = async (mapID, field, value, prev) => {
		let transaction = new EditMap_Transaction(mapID, field, prev, value, UpdateMapFieldInfo)
		props.tps.addTransaction(transaction)
		tpsRedo();
	}

	const deleteRegion = async (regionID) => {
		let map = activeList;
		let opcode = 0;
		let region = maps.find(map => map._id === regionID)
		let regionToDelete = {
			_id: region._id,
			name: region.name,
			parent: region.parent,
			capital: region.capital,
			leader: region.leader,
			owner: region.owner,
			landmarks: region.landmarks,
			subregions: region.subregions,
			sortRule: region.sortRule,
	 		sortDirection: region.sortDirection
		}
		let transaction = new UpdateMap_Transaction(map._id, region._id, regionToDelete, opcode, AddSubregion, DeleteSubregion, index)
		props.tps.addTransaction(transaction);
		tpsRedo();
	}

	const sort = (criteria) =>{
		let map = activeList;
		let opcode = 1;
		let direction = activeList.sortRule === criteria ? activeList.sortDirection : -1;
		let transaction = new SortMaps_Transaction(map._id, opcode, activeList.subregions, criteria, activeList.sortRule, direction , activeList.sortDirection, SortSubregions)
		props.tps.addTransaction(transaction);
		tpsRedo();
	}

	const loadMap = (list) => {
		props.tps.clearAllTransactions();
		setActiveList(list);
	}

	const setShowLogin = () => {
		toggleShowDelete(false);
		toggleShowCreate(false);
		toggleShowUpdate(false);
		toggleShowLogin(!showLogin);
	};

	const setShowCreate = () => {
		toggleShowDelete(false);
		toggleShowLogin(false);
		toggleShowUpdate(false);
		toggleShowCreate(!showCreate);
	};

	const setShowDelete = (regionID, index) => {
		setRegion(regionID);
		setIndex(index);
		toggleShowCreate(false);
		toggleShowLogin(false);
		toggleShowUpdate(false);
		toggleShowDelete(!showDelete)
	};

	const setShowUpdate = () => {
		toggleShowCreate(false);
		toggleShowLogin(false);
		toggleShowDelete(false);
		toggleShowUpdate(!showUpdate)
	};

	const setShowNameInput = (index) =>{
		toggleNameInput(true);
		toggleCapitalInput(false);
		toggleLeaderInput(false);
		setCurrentIndex(index)
	}
	const setShowCapitalInput = (index) =>{
		toggleNameInput(false);
		toggleCapitalInput(true);
		toggleLeaderInput(false);
		setCurrentIndex(index)
	}
	const setShowLeaderInput = (index) =>{
		toggleNameInput(false);
		toggleCapitalInput(false);
		toggleLeaderInput(true);
		setCurrentIndex(index)
	}

	return (
		<WLayout wLayout="header">
			<WLHeader>
				<WNavbar color="colored">
					<ul>
						<WNavItem>
							<Logo className='logo' clearTransactions = {clearTps}/>
						</WNavItem>
					</ul>

					<ul className="ancestor">
						{activeList && data && <Ancestors maps={maps} activeMap={activeList} clearTransactions = {clearTps}/>}
					</ul>

					<ul></ul>

					<ul>
						<NavbarOptions
							fetchUser={props.fetchUser} auth={auth}
							setShowCreate={setShowCreate} setShowLogin={setShowLogin}
							user={props.user} setShowUpdate={setShowUpdate} setActiveList={loadMap}
						/>
					</ul>
				</WNavbar>
			</WLHeader>

			<WLMain>
				<MainContents
					activeList={activeList} addNewSubregion={addSubregion} currentRegions={currentRegions}
					reloadList={reloadList} editMap={editMap} setShowDelete={setShowDelete} 
					undo={tpsUndo} redo={tpsRedo} canUndo={canUndo} canRedo={canRedo} clearTransactions = {clearTps}
					sort = {sort} 
					showNameInput = {showNameInput} showCapitalInput = {showCapitalInput} showLeaderInput = {showLeaderInput}
					toggleName = {toggleNameInput} toggleCapital = {toggleCapitalInput} toggleLeader = {toggleLeaderInput} index = {currentIndex}
					setShowCapitalInput = {setShowCapitalInput} setShowLeaderInput = {setShowLeaderInput} setShowNameInput = {setShowNameInput}
				/>
			</WLMain>

			{
				showDelete && (<Delete deleteMap={deleteRegion} activeid={region} setShowDelete={setShowDelete} />)
			}

			{
				showUpdate && (<UpdateAccount user={props.user} fetchUser={props.fetchUser} setShowUpdate={setShowUpdate} />)
			}

		</WLayout>
	)

}
export default withRouter(Spreadsheet);