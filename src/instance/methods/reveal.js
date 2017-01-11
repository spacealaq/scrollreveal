import { getNode, getNodes, logger } from '../../utils/core'
import { deepAssign, each, nextUniqueId } from '../../utils/generic'
import generateStyles from '../functions/generateStyles'
import initialize from '../functions/initialize'


export default function reveal (target, options, interval, sync) {

	/**
	 * The reveal method has an optional 2nd parameter,
	 * so here we just shuffle things around to accept
	 * the interval being passed as the 2nd argument.
	 */
	if (typeof options === 'number') {
		interval = parseInt(options)
		options = {}
	} else {
		options = options || {}
	}

	const containers = this.store.containers
	const container = getNode(options.container || this.defaults.container)
	const targets = getNodes(target, container)

	if (!targets.length) {
		logger('Reveal cannot be performed on 0 elements.')
		return this
	}

	/**
	 * Sequence intervals must be at least 16ms (60fps)
	 * but can be negative for sequencing in reverse.
	 */
	let sequence
	if (typeof interval === 'number' && Math.abs(interval) > 15) {
		const sequenceId = nextUniqueId()
		sequence = this.store.sequences[sequenceId] = {
			elementIds: [],
			firstActiveIndex: 0,
			id: sequenceId,
			interval,
			lastActiveIndex: 0,
		}
	}

	let containerId
	each(containers, (storedContainer, id) => {
		if (storedContainer.node === container) {
			containerId = parseInt(id)
		}
	})

	if (containerId === undefined) {
		containerId = nextUniqueId()
	}

	each(targets, node => {
		const element = {}
		const existingId = node.getAttribute('data-sr-id')

		try {
			if (existingId) {
				deepAssign(element, this.store.elements[existingId])
			} else {
				deepAssign(element, {
					id: nextUniqueId(),
					config: {},
					containerId,
					node,
				})
			}

			if (sequence) {
				element.sequence = {
					id: sequence.id,
					index: sequence.elementIds.length,
				}
				sequence.elementIds.push(element.id)
			}

			element.config = deepAssign({}, this.defaults, element.config, options)
			element.styles = generateStyles(element)

		} catch (error) {
			logger(error.message)
		}

		this.store.elements[element.id] = element
		node.setAttribute('data-sr-id', element.id)
	})

	containers[containerId] = {
		node: container,
	}

	/**
	* If reveal wasn't invoked by sync, we want to make
	* sure to add this call to the history.
	*/
	if (!sync) {
		this.store.history.push({ target, options, interval })

		/**
		* Push initialization to the event queue, giving chained
		* reveal calls time to be interpretted.
		*/
		if (this.initTimeout) window.clearTimeout(this.initTimeout)
		this.initTimeout = window.setTimeout(initialize.bind(this), 0)
	}

	return this
}
